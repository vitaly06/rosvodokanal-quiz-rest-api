import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAvrPlumberTaskDto } from './dto/avr-plumber.dto';

@Injectable()
export class AvrPlumberService {
  constructor(private prisma: PrismaService) {}

  private timeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  private calculateTimeScore(
    currentTime: string,
    allTimes: string[],
    maxScore: number = 50,
    minScore: number = 25,
  ): number {
    const currentSeconds = this.timeToSeconds(currentTime);
    const validTimes = allTimes
      .filter((t) => t && t !== '00:00')
      .map((t) => this.timeToSeconds(t));

    if (validTimes.length === 0) return maxScore;

    const bestTime = Math.min(...validTimes);
    const worstTime = Math.max(...validTimes);

    if (bestTime === worstTime) return maxScore;

    // Линейная интерполяция между лучшим и худшим временем
    const score =
      maxScore -
      ((currentSeconds - bestTime) * (maxScore - minScore)) /
        (worstTime - bestTime);

    return Number(Math.max(minScore, Math.min(maxScore, score)).toFixed(2));
  }

  private calculateStageScore(data: {
    timeScore: number;
    hydraulicTest: boolean;
    safetyPenalty: number;
    culturePenalty: number;
    qualityPenalty: number;
  }): number {
    if (!data.hydraulicTest) return 0;
    return Math.max(
      0,
      data.timeScore -
        data.safetyPenalty -
        data.culturePenalty -
        data.qualityPenalty,
    );
  }

  async updateTask(dto: UpdateAvrPlumberTaskDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        TestResult: {
          where: {
            nomination: { name: 'Слесарь АВР' },
          },
        },
        branch: true,
      },
    });

    if (!user || user.TestResult.length === 0) {
      throw new Error('Участник не найден или не проходил тест по номинации');
    }

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    // Получаем все существующие результаты
    const allTasks = await this.prisma.avrPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Рассчитываем баллы за время
    const timeScore = this.calculateTimeScore(
      dto.time,
      allTasks.map((t) => t.time),
    );

    const stageScore = this.calculateStageScore({
      timeScore,
      hydraulicTest: dto.hydraulicTest ?? false,
      safetyPenalty: dto.safetyPenalty ?? 0,
      culturePenalty: dto.culturePenalty ?? 0,
      qualityPenalty: dto.qualityPenalty ?? 0,
    });

    return this.prisma.avrPlumberTask.upsert({
      where: {
        avr_plumber_user_nomination_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
      update: {
        time: dto.time,
        timeScore,
        hydraulicTest: dto.hydraulicTest,
        safetyPenalty: dto.safetyPenalty ?? 0,
        culturePenalty: dto.culturePenalty ?? 0,
        qualityPenalty: dto.qualityPenalty ?? 0,
        stageScore,
        updatedAt: new Date(),
      },
      create: {
        userId: dto.userId,
        branchId: user.branchId,
        nominationId: nomination.id,
        time: dto.time,
        timeScore,
        hydraulicTest: dto.hydraulicTest ?? false,
        safetyPenalty: dto.safetyPenalty ?? 0,
        culturePenalty: dto.culturePenalty ?? 0,
        qualityPenalty: dto.qualityPenalty ?? 0,
        stageScore,
      },
    });
  }

  async getTable() {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший слесарь АВР на водопроводных сетях' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    // Получаем всех участников с их результатами
    const participants = await this.prisma.user.findMany({
      where: {
        TestResult: {
          some: {
            nominationId: nomination.id,
          },
        },
        participatingNominations: {
          has: practicNomination.id,
        },
      },
      include: {
        branch: true,
        AvrPlumberTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    // Получаем все времена для расчета относительных баллов
    const allTimes = (
      await this.prisma.avrPlumberTask.findMany({
        where: { nominationId: nomination.id },
      })
    )
      .map((t) => t.time)
      .filter((t) => t && t !== '00:00');

    const tableData = await Promise.all(
      participants.map(async (user) => {
        const task = user.AvrPlumberTask[0] || null;

        // Рассчитываем баллы за время
        const timeScore = task
          ? this.calculateTimeScore(task.time, allTimes)
          : 0;

        const practiceScore = task
          ? this.calculateStageScore({
              timeScore,
              hydraulicTest: task.hydraulicTest,
              safetyPenalty: task.safetyPenalty,
              culturePenalty: task.culturePenalty,
              qualityPenalty: task.qualityPenalty,
            })
          : 0;

        const theoryScore = await this.getTheoryScore(user.id, nomination.id);

        const lineNumber = await this.prisma.userLineNumber.findUnique({
          where: {
            user_practic_line_unique: {
              userId: user.id,
              practicNominationId: practicNomination.id,
            },
          },
        });

        return {
          userId: user.id,
          practicNominationId: practicNomination.id,
          lineNumber: lineNumber?.lineNumber ?? null,
          branchId: user.branchId,
          branchName: user.branch.address,
          participantName: user.fullName || `Участник ${user.id}`,
          number: user.number,
          time: task?.time || '00:00',
          timeScore,
          hydraulicTest: task?.hydraulicTest || false,
          safetyPenalty: task?.safetyPenalty || 0,
          culturePenalty: task?.culturePenalty || 0,
          qualityPenalty: task?.qualityPenalty || 0,
          theoryScore,
          practiceScore,
          total: theoryScore + practiceScore,
        };
      }),
    );

    // Сортируем по убыванию общего балла
    return tableData
      .sort((a, b) => a.participantName.localeCompare(b.participantName))
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  async getResultTable() {
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший слесарь АВР на водопроводных сетях' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const users = await this.prisma.user.findMany({
      where: {
        participatingNominations: { has: practicNomination.id },
      },
      include: { branch: true },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        const theoryResults = await this.prisma.testResult.findMany({
          where: { userId: user.id, nominationId: nomination.id },
        });

        const practicResults = await this.prisma.avrPlumberTask.findMany({
          where: { userId: user.id },
        });

        return {
          branchName: user.branch.address,
          fullName: user.fullName,
          theoryScore: theoryResults[0]?.score || 0,
          practiceScore: practicResults.reduce(
            (sum, elem) => sum + elem.stageScore,
            0,
          ),
          totalScore:
            (theoryResults[0]?.score || 0) +
            practicResults.reduce((sum, elem) => sum + elem.stageScore, 0),
        };
      }),
    );

    return result
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  async getTheoryScore(userId: number, nominationId: number) {
    const theoryResults = await this.prisma.testResult.findMany({
      where: { userId, nominationId },
    });
    return theoryResults[0]?.score || 0;
  }
}
