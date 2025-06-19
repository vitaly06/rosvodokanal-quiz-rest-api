import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { StartTestDto } from './dto/start-test.dto';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  private activeTests = new Map<
    number,
    {
      nominationId: number;
      startedAt: Date;
      answers: SubmitAnswerDto[];
    }
  >();

  async startTest(dto: StartTestDto) {
    const { number, nominationId } = dto;

    // Проверяем/создаем пользователя
    let user = await this.prisma.user.findUnique({ where: { number } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          number,
        },
      });
    }

    // Получаем номинацию
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
    });

    if (!nomination) {
      throw new NotFoundException('Номинация не найдена');
    }

    const allQuestions = await this.prisma.question.findMany({
      where: { nominationId },
      select: { id: true },
    });

    if (allQuestions.length === 0) {
      throw new NotFoundException('Для этой номинации нет вопросов');
    }

    const questionCount = Math.min(
      nomination.questionsCount,
      allQuestions.length,
    );

    // Перемешиваем вопросы и выбираем нужное количество
    const shuffledQuestions = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, questionCount);

    // Получаем полные данные для выбранных вопросов с ответами
    const selectedQuestions = await this.prisma.question.findMany({
      where: {
        id: { in: shuffledQuestions.map((q) => q.id) },
      },
      include: {
        answers: {
          select: {
            id: true,
            answer: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Рассчитываем время начала и окончания теста
    const startedAt = new Date();
    const [hours, minutes, seconds] = nomination.duration
      .split(':')
      .map(Number);
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    const finishedAt = new Date(startedAt.getTime() + durationMs);

    // Запоминаем начало теста
    this.activeTests.set(user.id, {
      nominationId,
      startedAt,
      answers: [],
    });

    // Формируем вопросы с вариантами ответов
    const questionsWithOptions = selectedQuestions.map((question) => ({
      id: question.id,
      text: question.question,
      photoName: question.photoName,
      options: question.answers,
    }));

    return {
      user,
      nomination: {
        id: nomination.id,
        name: nomination.name,
        duration: nomination.duration,
        totalQuestions: questionCount,
      },
      questions: questionsWithOptions,
      time: {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      },
    };
  }

  async finishTest(
    userId: number,
    answers: Array<{ questionId: number; optionId: number }>,
  ) {
    if (!this.activeTests.has(userId)) {
      throw new BadRequestException('Тест не начат');
    }
    let results;
    const testSession = this.activeTests.get(userId);
    if (answers.length) {
      results = await this.checkAnswers(answers);
    } else {
      results = {
        correctAnswers: 0,
        percentage: 0,
      };
    }

    const finishedAt = new Date();
    const startedAt = testSession.startedAt;

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: testSession.nominationId },
    });

    // Сохраняем результат теста с привязкой к существующим ответам
    const testResult = await this.prisma.testResult.create({
      data: {
        userId,
        nominationId: testSession.nominationId,
        score: results.correctAnswers,
        total: nomination.questionsCount,
        percentage: results.percentage,
        duration: this.formatDuration(String(startedAt), finishedAt),
        startedAt,
        finishedAt,
        answers: {
          connect: answers.map((a) => ({ id: a.optionId })),
        },
      },
      include: {
        nomination: true,
        user: true,
        answers: true,
      },
    });

    this.activeTests.delete(userId);

    return {
      result: testResult,
      details: results,
    };
  }

  private async checkAnswers(
    answers: Array<{ questionId: number; optionId: number }>,
  ) {
    const questionIds = answers.map((a) => a.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { answers: true },
    });
    const questionCount = await this.prisma.nomination.findUnique({
      where: { id: questions[0].nominationId },
      select: {
        questionsCount: true,
      },
    });
    let correctAnswers = 0;
    const detailedResults = [];

    for (const question of questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      const correctAnswer = question.answers.find((a) => a.correctness);
      const isCorrect = correctAnswer?.id === userAnswer?.optionId;

      if (isCorrect) correctAnswers++;

      detailedResults.push({
        questionId: question.id,
        questionText: question.question,
        userAnswerId: userAnswer?.optionId || null,
        correctAnswerId: correctAnswer?.id || null,
        isCorrect: !!isCorrect,
      });
    }

    return {
      correctAnswers,
      totalQuestions: questions.length,
      percentage: Math.round(
        (correctAnswers / questionCount.questionsCount) * 100,
      ),
      answers: detailedResults,
    };
  }

  async getResult(userId: number) {
    return this.prisma.testResult.findMany({
      where: { userId },
      include: { nomination: true },
    });
  }

  async getAllResult() {
    return this.prisma.testResult.findMany();
  }

  async getResultTable(userId: number, nominationId: number) {
    // 1. Получаем последний результат теста пользователя для данной номинации
    const latestResult = await this.prisma.testResult.findFirst({
      where: { userId, nominationId },
      orderBy: { finishedAt: 'desc' },
      include: {
        answers: {
          select: {
            id: true,
            answer: true,
            questionId: true,
            Question: {
              select: {
                question: true,
                answers: {
                  where: { correctness: true },
                  select: {
                    answer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!latestResult) {
      throw new NotFoundException('Результаты теста не найдены');
    }

    // 2. Формируем результат только для вопросов, которые были в тесте
    const result = latestResult.answers.map((answer) => {
      const correctAnswer =
        answer.Question.answers[0]?.answer || 'Правильный ответ не найден';

      return {
        questionId: answer.questionId,
        question: answer.Question.question,
        userAnswer: answer.answer || 'Не выбран',
        correctAnswer: correctAnswer,
        isCorrect: answer.Question.answers.some(
          (a) => a.answer === answer.answer,
        ),
      };
    });

    return result;
  }

  private formatDuration(startedAt: string, finishedAt: Date): string {
    const start = new Date(startedAt);
    const diff = (finishedAt.getTime() - start.getTime()) / 1000;
    const minutes = Math.floor(diff / 60);
    const seconds = Math.round(diff % 60);
    return `${minutes} мин ${seconds} сек`;
  }
}
