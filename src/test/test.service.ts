import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { StartTestDto } from './dto/start-test.dto';
import { FinishTestDto } from './dto/finish-test.dto';

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
      user = await this.prisma.user.create({ data: { number } });
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

  async finishTest(userId: number, dto: FinishTestDto) {
    if (!this.activeTests.has(userId)) {
      throw new BadRequestException('Тест не начат');
    }

    const testSession = this.activeTests.get(userId);
    const { fullName, branchId, startedAt } = dto;

    // Обновляем данные пользователя
    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, branchId },
    });

    // Проверяем ответы
    const results = await this.checkAnswers(testSession.answers);
    const finishedAt = new Date();

    // Получаем полные данные ответов для сохранения
    const answersToSave = await Promise.all(
      results.answers.map(async (a) => {
        const answer = await this.prisma.answer.findUnique({
          where: { id: a.userAnswerId },
        });
        return {
          answer: answer.answer,
          answerId: a.userAnswerId,
          questionId: a.questionId,
          correctness: a.isCorrect,
        };
      }),
    );

    // Сохраняем результат теста
    const testResult = await this.prisma.testResult.create({
      data: {
        userId,
        nominationId: testSession.nominationId,
        score: results.correctAnswers,
        total: results.totalQuestions,
        percentage: results.percentage,
        duration: this.formatDuration(startedAt, finishedAt),
        startedAt: new Date(startedAt),
        finishedAt,
        answers: {
          create: answersToSave.map((a) => ({
            answer: a.answer,
            answerId: a.answerId,
            questionId: a.questionId,
            correctness: a.correctness,
          })),
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

  private async checkAnswers(answers: SubmitAnswerDto[]) {
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
      const isCorrect = correctAnswer?.id === Number(userAnswer.answerId);

      if (isCorrect) correctAnswers++;

      detailedResults.push({
        questionId: question.id,
        questionText: question.question,
        userAnswerId: Number(userAnswer.answerId),
        correctAnswerId: correctAnswer?.id || null,
        isCorrect,
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
