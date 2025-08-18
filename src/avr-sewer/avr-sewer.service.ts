import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAvrSewerTaskDto } from './dto/avr-sewer-task.dto';
import { Injectable } from '@nestjs/common';
import { Branch } from '@prisma/client';

@Injectable()
export class AvrSewerService {
  constructor(private prisma: PrismaService) {}

  private timeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  async getResultTable() {
    const result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучшая бригада АВР на канализационных сетях' },
    });

    const theoryNomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const branches = await this.prisma.branch.findMany({
      where: {
        participatingNominations: { has: practicNomination.id },
      },
    });

    for (const branch of branches) {
      const practicResults = await this.prisma.avrSewerTask.findMany({
        where: { branchId: branch.id },
      });

      const theoryResults = await this.prisma.testResult.findMany({
        where: {
          user: {
            participatingNominations: { has: practicNomination.id },
            branch: { address: branch.address },
          },
          nomination: { id: theoryNomination.id },
        },
      });

      const team = await this.prisma.user.findMany({
        where: {
          branch: { id: branch.id },
          participatingNominations: { has: practicNomination.id },
        },
      });

      const practiceScore = practicResults.reduce(
        (sum, task) => sum + task.stageScore,
        0,
      );

      const theoryScore = theoryResults.reduce(
        (sum, result) => sum + result.score,
        0,
      );

      result.push({
        branchName: branch.address,
        team: team.map((user) => user.fullName),
        theoryScore,
        practiceScore,
        totalScore: theoryScore + practiceScore,
      });
    }

    return result
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  private calculateTimeScore(
    currentTime: string,
    allTimes: string[],
    maxScore: number,
    minScore: number,
  ): number {
    const currentSeconds = this.timeToSeconds(currentTime);
    const validTimes = allTimes
      .filter((t) => t && t !== '00:00')
      .map((t) => this.timeToSeconds(t));

    if (validTimes.length === 0) return maxScore;

    const bestTime = Math.min(...validTimes);
    const worstTime = Math.max(...validTimes);

    if (bestTime === worstTime) return maxScore;

    return Number(
      (
        maxScore -
        ((currentSeconds - bestTime) * (maxScore - minScore)) /
          (worstTime - bestTime)
      ).toFixed(2),
    );
  }

  async updateTask(dto: UpdateAvrSewerTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    const branchExists = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branchExists) throw new Error('Филиал не найден');

    const allTasks = await this.prisma.avrSewerTask.findMany({
      where: {
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
        NOT: { time: '00:00' },
      },
    });

    const [maxScore, minScore] = this.getScoreRangeForStage(dto.taskNumber);
    const timeScore = this.calculateTimeScore(
      dto.time,
      allTasks.map((t) => t.time),
      maxScore,
      minScore,
    );

    const stageScore = dto.hydraulicTest
      ? this.calculateStageScore(
          timeScore,
          dto.safetyPenalty ?? 0,
          dto.culturePenalty ?? 0,
          dto.qualityPenalty ?? 0,
        )
      : 0;

    return this.prisma.avrSewerTask.upsert({
      where: {
        avr_sewer_unique_task: {
          branchId: dto.branchId,
          nominationId: nomination.id,
          taskNumber: dto.taskNumber,
        },
      },
      update: {
        time: dto.time,
        timeScore,
        hydraulicTest: dto.hydraulicTest,
        safetyPenalty: dto.safetyPenalty,
        culturePenalty: dto.culturePenalty,
        qualityPenalty: dto.qualityPenalty,
        stageScore,
      },
      create: {
        branchId: dto.branchId,
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
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

  private getScoreRangeForStage(taskNumber: number): [number, number] {
    const ranges = {
      1: [100, 50],
      2: [80, 60],
      3: [100, 50],
      4: [80, 60],
    };
    return ranges[taskNumber] || [50, 25];
  }

  private calculateStageScore(
    timeScore: number,
    safetyPenalty: number,
    culturePenalty: number,
    qualityPenalty: number,
  ): number {
    return Math.max(
      0,
      timeScore - safetyPenalty - culturePenalty - qualityPenalty,
    );
  }

  async getTable() {
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучшая бригада АВР на канализационных сетях' },
    });
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    const branches = await this.prisma.branch.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
      },
    });
    const allTasks = await this.prisma.avrSewerTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Пересчет баллов для всех задач
    for (let stage = 1; stage <= 4; stage++) {
      const stageTasks = allTasks.filter(
        (t) => t.taskNumber === stage && t.time !== '00:00',
      );

      if (stageTasks.length > 0) {
        const [maxScore, minScore] = this.getScoreRangeForStage(stage);

        stageTasks.forEach((task) => {
          task.timeScore = this.calculateTimeScore(
            task.time,
            stageTasks.map((t) => t.time),
            maxScore,
            minScore,
          );
          task.stageScore = this.calculateStageScore(
            task.timeScore,
            task.safetyPenalty,
            task.culturePenalty,
            task.qualityPenalty,
          );
        });
      }
    }

    const result = await Promise.all(
      branches.map(async (branch) => {
        const tasks = allTasks.filter((t) => t.branchId === branch.id);
        const stages = [1, 2, 3, 4].map(
          (stage) =>
            tasks.find((t) => t.taskNumber === stage) ||
            this.createEmptyStage(stage),
        );

        const practiceScore = stages.reduce(
          (sum, stage) => sum + stage.stageScore,
          0,
        );

        const theoryScore = await this.getTheoryScore(
          branch,
          practicNomination.id,
          nomination.id,
        );

        const lineNumber = await this.prisma.branchLineNumber.findUnique({
          where: {
            branch_practic_line_unique: {
              branchId: branch.id,
              practicNominationId: practicNomination.id,
            },
          },
        });

        return {
          branchId: branch.id,
          branchName: branch.address,
          lineNumber: lineNumber?.lineNumber ?? null,
          stages,
          practiceScore,
          theoryScore,
          total: practiceScore + theoryScore,
        };
      }),
    );

    return result
      .sort((a, b) => a.branchName.localeCompare(b.branchName))
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  private createEmptyStage(taskNumber: number) {
    return {
      taskNumber,
      time: '00:00',
      timeScore: 0,
      hydraulicTest: true,
      safetyPenalty: 0,
      culturePenalty: 0,
      qualityPenalty: 0,
      stageScore: 0,
    };
  }

  async getTheoryScore(
    branch: Branch,
    practicNominationId: number,
    theoryNominationId: number,
  ) {
    const results = await this.prisma.testResult.findMany({
      where: {
        user: {
          participatingNominations: { has: practicNominationId },
          branch: { address: branch.address },
        },
        nomination: { id: theoryNominationId },
      },
    });
    return results.reduce((sum, r) => sum + r.score, 0);
  }
}
