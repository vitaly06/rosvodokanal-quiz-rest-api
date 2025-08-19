import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartTestDto } from './dto/start-test.dto';
import * as crypto from 'crypto';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  private testSessions = new Map<
    string,
    {
      userId: number;
      nominationId: number;
      startedAt: Date;
      finishedAt: Date;
      questionIds: number[];
    }
  >();

  async startTest(dto: StartTestDto) {
    const { number, nominationId } = dto;

    // Находим или создаем пользователя
    let user = await this.prisma.user.findUnique({ where: { number } });
    if (!user) {
      user = await this.prisma.user.create({ data: { number } });
    }

    // Проверяем номинацию
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
    });
    if (!nomination) {
      throw new NotFoundException('Номинация не найдена');
    }

    // Получаем вопросы
    const allQuestions = await this.prisma.question.findMany({
      where: { nominationId },
      select: { id: true },
    });

    if (allQuestions.length === 0) {
      throw new NotFoundException('Для номинации нет вопросов');
    }

    // Выбираем случайные вопросы
    const questionCount = Math.min(
      nomination.questionsCount,
      allQuestions.length,
    );
    const shuffledQuestions = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, questionCount);

    // Рассчитываем время окончания
    const startedAt = new Date();
    const [hours, minutes, seconds] = nomination.duration
      .split(':')
      .map(Number);
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    const finishedAt = new Date(startedAt.getTime() + durationMs);

    // Генерируем уникальный sessionId
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Сохраняем сессию
    this.testSessions.set(sessionId, {
      userId: user.id,
      nominationId,
      startedAt,
      finishedAt,
      questionIds: shuffledQuestions.map((q) => q.id),
    });

    // Получаем вопросы с вариантами ответов
    const questionsWithOptions = await this.prisma.question.findMany({
      where: { id: { in: shuffledQuestions.map((q) => q.id) } },
      include: {
        answers: {
          select: { id: true, answer: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return {
      sessionId,
      user,
      nomination: {
        id: nomination.id,
        name: nomination.name,
        duration: nomination.duration,
        totalQuestions: questionCount,
      },
      questions: questionsWithOptions.map((q) => ({
        id: q.id,
        text: q.question,
        photoName: q.photoName,
        options: q.answers,
      })),
      finishedAt: finishedAt.toISOString(),
    };
  }

  async getSessionData(sessionId: string) {
    const session = this.testSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: session.nominationId },
    });

    const questions = await this.prisma.question.findMany({
      where: { id: { in: session.questionIds } },
      include: {
        answers: {
          select: { id: true, answer: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return {
      user,
      nomination,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.question,
        photoName: q.photoName,
        options: q.answers,
      })),
      finishedAt: session.finishedAt.toISOString(),
    };
  }

  async finishTest(
    sessionId: string,
    answers: Array<{ questionId: number; optionId: number | null }>,
    fullName?: string,
    branchId?: number,
  ) {
    const session = this.testSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('Сессия не найдена или истекла');
    }

    // Обновляем данные пользователя
    // if (fullName || branchId) {
    //   await this.prisma.user.update({
    //     where: { id: session.userId },
    //     data: { fullName, branchId },
    //   });
    // }
    if (fullName || branchId) {
      await this.prisma.fullName.update({
        where: {
          userId: session.userId,
        },
        data: {
          fullName,
          branchId,
        },
      });
    }

    // Проверяем ответы
    const results = await this.checkAnswers(answers);

    // Сохраняем результат теста
    const testResult = await this.prisma.testResult.create({
      data: {
        userId: session.userId,
        nominationId: session.nominationId,
        score: results.correctAnswers,
        total: results.totalQuestions,
        percentage: results.percentage,
        duration: this.formatDuration(session.startedAt, new Date()),
        startedAt: session.startedAt,
        finishedAt: new Date(),
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

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: questions[0].nominationId },
      select: { questionsCount: true },
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
        isCorrect: !!isCorrect,
      });
    }

    return {
      correctAnswers,
      totalQuestions: questions.length,
      percentage: Math.round(
        (correctAnswers / nomination.questionsCount) * 100,
      ),
      answers: detailedResults,
    };
  }

  async getResult(sessionId: string) {
    const session = this.testSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('Сессия не найдена');
    }

    return this.prisma.testResult.findMany({
      where: {
        userId: session.userId,
        nominationId: session.nominationId,
      },
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

    // 2. Получаем только те вопросы, которые были в тесте
    const testQuestionIds = latestResult.testAnswers.map((a) => a.questionId);

    // 3. Формируем таблицу результатов только для вопросов теста
    return latestResult.testAnswers
      .filter((answer) => testQuestionIds.includes(answer.questionId))
      .map((testAnswer) => {
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

  private formatDuration(startedAt: Date, finishedAt: Date): string {
    const diff = (finishedAt.getTime() - startedAt.getTime()) / 1000;
    const minutes = Math.floor(diff / 60);
    const seconds = Math.round(diff % 60);
    return `${minutes} мин ${seconds} сек`;
  }
}
