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

    // Получаем номинацию с вопросами и вариантами ответов
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
      include: {
        questions: {
          include: {
            answers: {
              select: {
                id: true,
                answer: true,
              },
            },
          },
        },
      },
    });

    if (!nomination) {
      throw new NotFoundException('Номинация не найдена');
    }

    // Рассчитываем время начала и окончания теста
    const startedAt = new Date();

    // Парсим duration в формате hh:mm:ss
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
    const questionsWithOptions = nomination.questions
      .map((question) => ({
        id: question.id,
        text: question.question,
        photoName: question.photoName,
        options: question.answers.sort((a, b) => a.id - b.id),
      }))
      .sort((a, b) => a.id - b.id);

    return {
      user,
      nomination: {
        id: nomination.id,
        name: nomination.name,
        duration: nomination.duration,
        totalQuestions: nomination.questionsCount,
      },
      questions: questionsWithOptions,
      time: {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(), // Теперь используем рассчитанное значение
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
      select: {
        id: true,
        answers: {
          orderBy: { questionId: 'asc' },
          select: {
            id: true,
            answer: true,
            questionId: true,
            testResultId: true, // Добавляем для проверки связи
            Question: {
              select: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!latestResult) {
      throw new NotFoundException('Результаты теста не найдены');
    }

    // 2. Получаем ВСЕ вопросы номинации и их правильные ответы
    const questionsWithCorrectAnswers = await this.prisma.question.findMany({
      where: { nominationId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        question: true,
        answers: {
          where: { correctness: true },
          select: {
            answer: true,
          },
        },
      },
    });

    // 3. Формируем результат
    const result = questionsWithCorrectAnswers.map((question) => {
      // Находим ответ пользователя на этот вопрос (если есть)
      const userAnswer = latestResult.answers.find(
        (a) =>
          a.questionId === question.id && a.testResultId === latestResult.id,
      );

      // Получаем правильный ответ (берем первый, если их несколько)
      const correctAnswer =
        question.answers[0]?.answer || 'Правильный ответ не найден';

      return {
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer?.answer || 'Не выбран',
        correctAnswer: correctAnswer,
        isCorrect: userAnswer
          ? question.answers.some((a) => a.answer === userAnswer.answer)
          : false,
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
