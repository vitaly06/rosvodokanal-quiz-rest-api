import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAvrSewerPlumberTaskDto } from './dto/avr-sewer-plumber.dto';

@Injectable()
export class AvrSewerPlumberService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший слесарь АВР на канализационных сетях' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const users = await this.prisma.user.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
      },
      include: {
        branch: true,
      },
    });

    let theoryResults;
    let practicResults;
    for (const user of users) {
      theoryResults = await this.prisma.testResult.findMany({
        where: {
          userId: user.id,
          nominationId: nomination.id,
        },
      });

      practicResults = await this.prisma.avrSewerPlumberTask.findMany({
        where: { userId: user.id },
      });

      result.push({
        branchName: user.branch.address,
        fullName: user.fullName,
        theoryScore: theoryResults[0].score || 0,
        practiceScore: practicResults.reduce(
          (sum, elem) => (sum += elem.stageScore),
          0,
        ),
        totalScore:
          (theoryResults[0].score || 0) +
          practicResults.reduce((sum, elem) => (sum += elem.stageScore), 0),
      });
    }

    result = result.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < result.length; i++) {
      result[i].place = i + 1;
    }

    return result;
  }

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

    // Если нет других результатов, возвращаем максимальный балл
    if (validTimes.length === 0) return maxScore;

    const bestTime = Math.min(...validTimes);
    const worstTime = Math.max(...validTimes);

    // Если все показали одинаковое время
    if (bestTime === worstTime) return maxScore;

    // Линейная интерполяция между лучшим и худшим временем
    const score =
      maxScore -
      ((currentSeconds - bestTime) * (maxScore - minScore)) /
        (worstTime - bestTime);

    // Гарантируем, что баллы в пределах диапазона
    return Number(Math.max(minScore, Math.min(maxScore, score)).toFixed(2));
  }

  private calculateStageScore(
    timeScore: number,
    hydraulicTest: boolean,
    safetyPenalty: number,
    culturePenalty: number,
    qualityPenalty: number,
  ): number {
    if (!hydraulicTest) return 0;
    return Math.max(
      0,
      timeScore - safetyPenalty - culturePenalty - qualityPenalty,
    );
  }

  async updateTask(dto: UpdateAvrSewerPlumberTaskDto) {
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

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    // Получаем все существующие результаты
    const allTasks = await this.prisma.avrSewerPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Рассчитываем баллы за время
    const timeScore = this.calculateTimeScore(
      dto.time,
      allTasks.map((t) => t.time),
    );

    const stageScore = this.calculateStageScore(
      timeScore,
      dto.hydraulicTest,
      dto.safetyPenalty ?? 0,
      dto.culturePenalty ?? 0,
      dto.qualityPenalty ?? 0,
    );

    return this.prisma.avrSewerPlumberTask.upsert({
      where: {
        avr_sewer_plumber_unique: {
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
        hydraulicTest: dto.hydraulicTest,
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
      where: { name: 'Лучший слесарь АВР на канализационных сетях' },
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
        AvrSewerPlumberTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    // Получаем все времена для расчета относительных баллов
    const allTimes = (
      await this.prisma.avrSewerPlumberTask.findMany({
        where: { nominationId: nomination.id },
      })
    )
      .map((t) => t.time)
      .filter((t) => t && t !== '00:00');

    const tableData = await Promise.all(
      participants.map(async (user) => {
        const task = user.AvrSewerPlumberTask[0] || null;

        // Рассчитываем баллы за время
        const timeScore = task
          ? this.calculateTimeScore(task.time, allTimes)
          : 0;

        const practiceScore = task
          ? this.calculateStageScore(
              timeScore,
              task.hydraulicTest,
              task.safetyPenalty,
              task.culturePenalty,
              task.qualityPenalty,
            )
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
          branchId: user.branchId,
          practicNominationId: practicNomination.id,
          lineNumber: lineNumber?.lineNumber ?? null,
          branchName: user.branch.address,
          userId: user.id,
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

    return tableData
      .sort((a, b) => a.participantName.localeCompare(b.participantName))
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  async getTheoryScore(userId: number, nominationId: number) {
    const theoryResults = await this.prisma.testResult.findMany({
      where: {
        userId,
        nominationId,
      },
    });

    return theoryResults[0].score || 0;
  }
}
