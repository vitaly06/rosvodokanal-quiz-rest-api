import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAvrSewerPlumberTaskDto } from './dto/avr-sewer-plumber.dto';

@Injectable()
export class AvrSewerPlumberService {
  constructor(private prisma: PrismaService) {}

  private timeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  private calculateTimeScore(
    currentTime: string,
    sortedTimes: string[],
    currentIndex: number,
    maxScore: number = 50,
    minScore: number = 25,
  ): number {
    if (currentIndex === 0) return maxScore; // First place gets max score
    if (currentIndex === sortedTimes.length - 1) return minScore; // Last place gets min score

    const currentSeconds = this.timeToSeconds(currentTime);
    const prevSeconds = this.timeToSeconds(sortedTimes[currentIndex - 1]);
    const nextSeconds = this.timeToSeconds(sortedTimes[currentIndex + 1]);

    // Calculate time differences with neighbors
    const diffWithPrev = currentSeconds - prevSeconds;
    const diffWithNext = nextSeconds - currentSeconds;
    const avgDiff = (diffWithPrev + diffWithNext) / 2;

    // Calculate total time range
    const totalTimeRange =
      this.timeToSeconds(sortedTimes[sortedTimes.length - 1]) -
      this.timeToSeconds(sortedTimes[0]);

    // Calculate total score range
    const totalScoreRange = maxScore - minScore;

    // Calculate score by accumulating penalties for each position
    let score = maxScore;
    for (let i = 0; i < currentIndex; i++) {
      const prevTime = this.timeToSeconds(sortedTimes[i]);
      const nextTime = this.timeToSeconds(sortedTimes[i + 1]);
      const localDiff = nextTime - prevTime;
      const localPenalty = (localDiff / totalTimeRange) * totalScoreRange;
      score -= localPenalty;
    }

    return Math.max(minScore, Math.min(maxScore, Number(score.toFixed(2))));
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
        fullName: { include: { branch: true } },
      },
    });

    // if (!user || user.TestResult.length === 0) {
    //   throw new Error('Участник не найден или не проходил тест по номинации');
    // }

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    // Get all existing results
    const allTasks = await this.prisma.avrSewerPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Get all valid times
    const allTimes = allTasks
      .map((t) => t.time)
      .filter((t) => t && t !== '00:00');

    // Add current time if valid
    if (dto.time && dto.time !== '00:00') {
      allTimes.push(dto.time);
    }

    let timeScore = 25; // Default to min score

    if (allTimes.length > 0 && dto.time && dto.time !== '00:00') {
      // Sort times from best to worst
      const sortedTimes = [...allTimes].sort(
        (a, b) => this.timeToSeconds(a) - this.timeToSeconds(b),
      );

      // Find current time's position
      const currentIndex = sortedTimes.findIndex((t) => t === dto.time);
      if (currentIndex >= 0) {
        timeScore = this.calculateTimeScore(
          dto.time,
          sortedTimes,
          currentIndex,
          50, // maxScore
          25, // minScore
        );
      }
    }

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
        branchId: user.fullName.branchId,
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

    // Get all participants with their results
    const participants = await this.prisma.user.findMany({
      where: {
        // TestResult: {
        //   some: {
        //     nominationId: nomination.id,
        //   },
        // },
        fullName: {
          participatingNominations: {
            has: practicNomination.id,
          },
        },
      },
      include: {
        fullName: { include: { branch: true } },
        AvrSewerPlumberTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    console.log(participants);

    // Get all tasks for score calculation
    const allTasks = await this.prisma.avrSewerPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Get all valid times
    const validTimes = allTasks
      .map((t) => t.time)
      .filter((t) => t && t !== '00:00');

    let tableData = await Promise.all(
      participants.map(async (user) => {
        const task = user.AvrSewerPlumberTask[0] || null;

        // Calculate time score
        let timeScore = 25; // Default to min score

        if (validTimes.length > 0 && task?.time && task.time !== '00:00') {
          // Sort times from best to worst
          const sortedTimes = [...validTimes].sort(
            (a, b) => this.timeToSeconds(a) - this.timeToSeconds(b),
          );

          // Find current time's position
          const currentIndex = sortedTimes.findIndex((t) => t === task.time);
          if (currentIndex >= 0) {
            timeScore = this.calculateTimeScore(
              task.time,
              sortedTimes,
              currentIndex,
              50, // maxScore
              25, // minScore
            );
          }
        }

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
          branchId: user.fullName.branchId,
          practicNominationId: practicNomination.id,
          lineNumber: lineNumber?.lineNumber ?? null,
          branchName: user.fullName.branch.address,
          userId: user.id,
          participantName: user.fullName.fullName || `Участник ${user.id}`,
          number: user.number,
          time: task?.time || '00:00',
          timeScore: timeScore.toFixed(2),
          hydraulicTest: task?.hydraulicTest || false,
          safetyPenalty: task?.safetyPenalty || 0,
          culturePenalty: task?.culturePenalty || 0,
          qualityPenalty: task?.qualityPenalty || 0,
          theoryScore: theoryScore.toFixed(2),
          practiceScore: practiceScore.toFixed(2),
          total: (theoryScore + practiceScore).toFixed(2),
        };
      }),
    );

    tableData = tableData
      .sort((a, b) => +b.total - +a.total)
      .map((item, index) => ({ ...item, place: index + 1 }));

    return tableData.sort((a, b) =>
      a.participantName.localeCompare(b.participantName),
    );
  }

  async getResultTable() {
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший слесарь АВР на канализационных сетях' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const users = await this.prisma.user.findMany({
      where: {
        fullName: { participatingNominations: { has: practicNomination.id } },
      },
      include: { fullName: { include: { branch: true } } },
    });

    console.log(users);

    const result = await Promise.all(
      users.map(async (user) => {
        const theoryResults = await this.prisma.testResult.findMany({
          where: { userId: user.id, nominationId: nomination.id },
        });

        const practicResults = await this.prisma.avrSewerPlumberTask.findMany({
          where: { userId: user.id },
        });

        return {
          branchName: user.fullName.branch.address,
          fullName: user.fullName.fullName,
          theoryScore: (theoryResults[0]?.score || 0).toFixed(2),
          practiceScore: practicResults
            .reduce((sum, elem) => sum + elem.stageScore, 0)
            .toFixed(2),
          totalScore: (
            (theoryResults[0]?.score || 0) +
            practicResults.reduce((sum, elem) => sum + elem.stageScore, 0)
          ).toFixed(2),
        };
      }),
    );

    return result
      .sort((a, b) => +b.totalScore - +a.totalScore)
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  async getTheoryScore(userId: number, nominationId: number) {
    const theoryResults = await this.prisma.testResult.findMany({
      where: { userId, nominationId },
    });
    return theoryResults[0]?.score || 0;
  }
}
