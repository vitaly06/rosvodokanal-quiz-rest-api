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

    const testSession = this.activeTests.get(userId);
    const results = await this.checkAnswers(answers);
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
      percentage: Math.round((correctAnswers / questions.length) * 100),
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
    // 1. Получаем ответы пользователя из TestResult (с привязкой к вопросам)
    const userTestResults = await this.prisma.testResult.findMany({
      where: { userId, nominationId },
      select: {
        answers: {
          orderBy: { questionId: 'asc' }, // Сортируем по id вопроса
          select: {
            id: true,
            answer: true,
            questionId: true,
            Question: {
              select: {
                question: true,
              },
            }, // Чтобы знать, к какому вопросу относится ответ
          },
        },
      },
    });

    if (userTestResults.length === 0 || !userTestResults[0].answers.length) {
      throw new NotFoundException('Ответы пользователя не найдены');
    }

    // 2. Получаем все вопросы номинации с вариантами ответов (отсортированными по questionId и id)
    const questionsWithAnswers = await this.prisma.question.findMany({
      where: { nominationId },
      orderBy: { id: 'asc' }, // Сортируем вопросы по id
      select: {
        id: true, // id вопроса
        answers: {
          orderBy: { id: 'asc' }, // Сортируем варианты ответов по id
          select: {
            id: true,
            correctness: true,
            answer: true,
          },
        },
      },
    });

    if (questionsWithAnswers.length === 0) {
      throw new NotFoundException('Вопросы номинации не найдены');
    }

    const result: any = [];
    let forAnswer = {};
    for (let i = 0; i < userTestResults[0].answers.length; i++) {
      forAnswer['question'] = userTestResults[0].answers[i].Question.question;
      forAnswer['userAnswer'] = userTestResults[0].answers[i].answer;
      forAnswer['correctAnswer'] = questionsWithAnswers[i].answers.find(
        (answer) => answer.correctness == true,
      ).answer;
      result.push(forAnswer);
      forAnswer = {};
    }
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
