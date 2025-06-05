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

    // Получаем номинацию с вопросами (без ответов)
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            photoName: true,
            nominationId: true,
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

    return {
      user,
      nomination: {
        id: nomination.id,
        name: nomination.name,
        duration: nomination.duration,
        totalQuestions: nomination.questionsCount,
      },
      questions: nomination.questions, // Все вопросы без ответов
      questionNumber: 1,
      totalQuestions: nomination.questionsCount,
    };
  }

  private async getQuestionOptions(questionId: number) {
    return this.prisma.answer.findMany({
      where: { questionId },
      select: { id: true, answer: true },
    });
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
      include: { questions: true },
    });

    const currentQuestionIndex = nomination.questions.findIndex(
      (q) => q.id === dto.questionId,
    );

    if (
      currentQuestionIndex === -1 ||
      currentQuestionIndex === nomination.questions.length - 1
    ) {
      return { completed: true };
    }

    const nextQuestion = nomination.questions[currentQuestionIndex + 1];

    return {
      completed: false,
      nextQuestion: {
        id: nextQuestion.id,
        text: nextQuestion.question,
        options: await this.getQuestionOptions(nextQuestion.id),
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

    // Сохраняем результат
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
          create: results.answers.map((a) => ({
            answer: a.userAnswer,
            questionId: a.questionId,
            correctness: a.isCorrect,
          })),
        },
      },
      include: {
        nomination: true,
        user: true,
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
      include: { answers: { where: { correctness: true } } },
    });

    let correctAnswers = 0;
    const detailedResults = [];

    for (const question of questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      const isCorrect = question.answers.some(
        (a) => a.answer === userAnswer.answer,
      );

      if (isCorrect) correctAnswers++;

      detailedResults.push({
        questionId: question.id,
        questionText: question.question,
        userAnswer: userAnswer.answer,
        correctAnswer: question.answers[0]?.answer || '',
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
