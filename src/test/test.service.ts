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

    // Запоминаем начало теста
    this.activeTests.set(user.id, {
      nominationId,
      startedAt: new Date(),
      answers: [],
    });

    // Формируем вопросы с вариантами ответов
    const questionsWithOptions = nomination.questions.map((question) => ({
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
        totalQuestions: nomination.questionsCount,
      },
      questions: questionsWithOptions,
    };
  }

  async submitAnswer(userId: number, dto: SubmitAnswerDto) {
    if (!this.activeTests.has(userId)) {
      throw new BadRequestException('Тест не начат');
    }

    const testSession = this.activeTests.get(userId);
    testSession.answers.push(dto);

    // Получаем следующий вопрос
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: testSession.nominationId },
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

    const currentQuestionIndex = nomination.questions.findIndex(
      (q) => q.id === dto.questionId,
    );

    if (currentQuestionIndex === -1) {
      throw new NotFoundException('Вопрос не найден');
    }

    if (currentQuestionIndex === nomination.questions.length - 1) {
      return { completed: true };
    }

    const nextQuestion = nomination.questions[currentQuestionIndex + 1];

    return {
      completed: false,
      nextQuestion: {
        id: nextQuestion.id,
        text: nextQuestion.question,
        photoName: nextQuestion.photoName,
        options: nextQuestion.answers,
      },
      questionNumber: currentQuestionIndex + 2,
      totalQuestions: nomination.questions.length,
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

    // Сохраняем результат теста с привязкой к существующим ответам
    const testResult = await this.prisma.testResult.create({
      data: {
        userId,
        nominationId: testSession.nominationId,
        score: results.correctAnswers,
        total: results.totalQuestions,
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

  private formatDuration(startedAt: string, finishedAt: Date): string {
    const start = new Date(startedAt);
    const diff = (finishedAt.getTime() - start.getTime()) / 1000;
    const minutes = Math.floor(diff / 60);
    const seconds = Math.round(diff % 60);
    return `${minutes} мин ${seconds} сек`;
  }
}
