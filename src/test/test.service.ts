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
    const { number, nominationId } = { ...dto };

    const user = await this.prisma.user.findUnique({
      where: { number },
    });
    if (!user) {
      await this.prisma.user.create({
        data: {
          number,
        },
      });
    }

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
    });
    if (!nomination) {
      throw new NotFoundException('Номинация с таким id не найдена');
    }
    // все вопросы номинации
    const allQuestions = await this.prisma.question.findMany({
      where: { nominationId },
      select: {
        id: true,
      },
    });

    if (allQuestions.length == 0) {
      throw new NotFoundException('Для данной номинации не найдены вопросы');
    }
    // выбираем кол-во вопросов для теста
    const questionCount = Math.min(
      nomination.questionsCount,
      allQuestions.length,
    );

    const shuffledQuestions = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, questionCount);

    const selectedQuestions = await this.prisma.question.findMany({
      where: { id: { in: shuffledQuestions.map((a) => a.id) } },
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

    //   // Запоминаем начало теста
    this.activeTests.set(user.id, {
      nominationId,
      startedAt,
      answers: [],
    });

    // Вопросы с вариантами ответа
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
    answers: Array<{ questionId: number; optionId: number | null }>,
  ) {
    console.log(answers.length);
    if (!this.activeTests.has(userId)) {
      throw new BadRequestException('Тест не начат');
    }

    const testSession = this.activeTests.get(userId);
    const results = answers.length
      ? await this.checkAnswers(answers)
      : { correctAnswers: 0, percentage: 0 };

    const finishedAt = new Date();
    const startedAt = testSession.startedAt;

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: testSession.nominationId },
    });
    await this.prisma.testResult.deleteMany({
      where: {
        userId,
        nominationId: testSession.nominationId,
      },
    });
    const testResult = await this.prisma.testResult.create({
      data: {
        userId,
        nominationId: nomination.id,
        score: results.correctAnswers,
        total: nomination.questionsCount,
        percentage: results.percentage,
        duration: this.formatDuration(String(startedAt), finishedAt),
        startedAt,
        finishedAt,
        testAnswers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            optionId: a.optionId || null,
          })),
        },
      },
      include: {
        nomination: true,
        user: true,
        testAnswers: true,
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
    // 1. Получаем последний результат теста
    const latestResult = await this.prisma.testResult.findFirst({
      where: { userId, nominationId },
      orderBy: { finishedAt: 'desc' },
      include: {
        testAnswers: {
          include: {
            // Подключаем связанный вопрос
            question: {
              select: {
                id: true,
                question: true,
                answers: {
                  where: { correctness: true },
                  select: {
                    id: true,
                    answer: true,
                  },
                },
              },
            },
            // Подключаем выбранный ответ (если optionId не null)
            option: {
              select: {
                id: true,
                answer: true,
              },
            },
          },
        },
      },
    });

    if (!latestResult) {
      throw new NotFoundException('Результаты теста не найдены');
    }

    // 2. Формируем таблицу результатов
    return latestResult.testAnswers.map((testAnswer) => {
      const correctAnswer =
        testAnswer.question.answers[0]?.answer || 'Нет правильного ответа';
      const userAnswer = testAnswer.optionId
        ? testAnswer.option?.answer || 'Ответ не найден'
        : 'Не выбран';

      return {
        questionId: testAnswer.questionId,
        question: testAnswer.question.question,
        userAnswer,
        correctAnswer,
        isCorrect: testAnswer.option?.answer === correctAnswer,
      };
    });
  }

  private formatDuration(startedAt: string, finishedAt: Date): string {
    const start = new Date(startedAt);
    const diff = (finishedAt.getTime() - start.getTime()) / 1000;
    const minutes = Math.floor(diff / 60);
    const seconds = Math.round(diff % 60);
    return `${minutes} мин ${seconds} сек`;
  }
}
