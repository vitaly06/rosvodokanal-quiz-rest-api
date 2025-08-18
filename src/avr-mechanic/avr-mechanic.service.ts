import { Injectable } from '@nestjs/common';
import { UpdateAvrMechanicTaskDto } from './dto/avr-mechanic.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Branch } from '@prisma/client';

@Injectable()
export class AvrMechanicService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    // практическая номинация
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучшая бригада АВР на водопроводных сетях' },
    });

    // теоретическая номинация
    const theoryNomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const branchs = await this.prisma.branch.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
      },
    });
    let practicResults;
    let theoryResults;
    for (const branch of branchs) {
      practicResults = await this.prisma.avrMechanicTask.findMany({
        where: { branchId: branch.id },
        select: {
          stageScore: true,
        },
      });

      theoryResults = await this.prisma.testResult.findMany({
        where: {
          user: {
            participatingNominations: {
              has: practicNomination.id,
            },
            branch: {
              address: branch.address,
            },
          },
          nomination: {
            id: theoryNomination.id,
          },
        },
      });

      const team = await this.prisma.user.findMany({
        where: {
          branch: { id: branch.id },
          participatingNominations: {
            has: practicNomination.id,
          },
        },
      });

      result.push({
        branchName: branch.address,
        team: team.map((elem) => elem.fullName),
        theoryScore:
          theoryResults.length != 0
            ? theoryResults.reduce((sum, elem) => (sum += elem.score), 0)
            : 0,
        practiceScore: practicResults.reduce(
          (sum, elem) => (sum += elem.stageScore),
          0,
        ),
        totalScore:
          (theoryResults.length != 0
            ? theoryResults.reduce((sum, elem) => (sum += elem.score), 0)
            : 0) +
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

  async updateTask(dto: UpdateAvrMechanicTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
      select: { id: true },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    // Проверяем существует ли branch
    const branchExists = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });

    if (!branchExists) {
      throw new Error('Филиал не найден');
    }

    // Получаем все записи для текущего этапа
    const allTasksForStage = await this.prisma.avrMechanicTask.findMany({
      where: {
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
        NOT: { time: '00:00' },
      },
    });

    // Добавляем текущее время (если оно валидное)
    const validTimes = allTasksForStage
      .map((t) => t.time)
      .filter((time) => time && time !== '00:00');

    if (dto.time && dto.time !== '00:00') {
      validTimes.push(dto.time);
    }

    // Если нет валидных времен, используем минимальный балл
    let timeScore = this.getScoreRangeForStage(dto.taskNumber)[1]; // minScore

    if (validTimes.length > 0) {
      const [maxScore, minScore] = this.getScoreRangeForStage(dto.taskNumber);

      const sortedTimes = [...validTimes].sort(
        (a, b) => this.timeToSeconds(a) - this.timeToSeconds(b),
      );

      const bestTime = sortedTimes[0];
      const worstTime = sortedTimes[sortedTimes.length - 1];

      if (dto.time && dto.time !== '00:00') {
        timeScore = this.calculateTimeScore(
          dto.time,
          bestTime,
          worstTime,
          maxScore,
          minScore,
        );
      }
    }
    const stageScore = this.calculateStageScore({
      timeScore,
      hydraulicTest: dto.hydraulicTest ?? false,
      safetyPenalty: dto.safetyPenalty ?? 0,
      culturePenalty: dto.culturePenalty ?? 0,
      qualityPenalty: dto.qualityPenalty ?? 0,
    });

    return this.prisma.avrMechanicTask.upsert({
      where: {
        branchId_nominationId_taskNumber: {
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
        branch: {
          connect: { id: dto.branchId },
        },
        nomination: {
          connect: { id: nomination.id },
        },
        taskNumber: dto.taskNumber,
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
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучшая бригада АВР на водопроводных сетях' },
    });

    const branches = await this.prisma.branch.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
      },
    });
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
      select: { id: true },
    });

    const allTasks = await this.prisma.avrMechanicTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Пересчитываем баллы для всех задач по новой формуле
    for (let stage = 1; stage <= 3; stage++) {
      const stageTasks = allTasks.filter(
        (t) => t.taskNumber === stage && t.time !== '00:00',
      );

      if (stageTasks.length > 0) {
        const [maxScore, minScore] = this.getScoreRangeForStage(stage);

        // Сортируем задачи по времени (от лучшего к худшему)
        const sortedTasks = [...stageTasks].sort(
          (a, b) => this.timeToSeconds(a.time) - this.timeToSeconds(b.time),
        );

        // Рассчитываем баллы
        sortedTasks.forEach((task, index) => {
          if (index === sortedTasks.length - 1) {
            task.timeScore = minScore;
          } else {
            const step = (maxScore - minScore) / (sortedTasks.length - 1);
            task.timeScore = maxScore - index * step; // Без Math.round
          }

          task.stageScore = this.calculateStageScore({
            timeScore: task.timeScore,
            hydraulicTest: task.hydraulicTest,
            safetyPenalty: task.safetyPenalty,
            culturePenalty: task.culturePenalty,
            qualityPenalty: task.qualityPenalty,
          });
        });
      }
    }

    // Формируем таблицу - используем Promise.all для ожидания всех асинхронных операций
    const result = await Promise.all(
      branches.map(async (branch) => {
        const tasks = allTasks.filter((t) => t.branchId === branch.id);

        const stages = Array(3)
          .fill(null)
          .map((_, i) => {
            const task = tasks.find((t) => t.taskNumber === i + 1);
            return (
              task || {
                taskNumber: i + 1,
                time: '00:00',
                timeScore: 0,
                hydraulicTest: false,
                safetyPenalty: 0,
                culturePenalty: 0,
                qualityPenalty: 0,
                stageScore: 0,
              }
            );
          });

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
          practicNominationId: practicNomination.id,
          lineNumber: lineNumber?.lineNumber || null,
          branchName: branch.address,
          stages: stages.map((stage) => ({
            ...stage,
            time: stage.time || '00:00',
          })),
          practiceScore,
          theoryScore,
          total: theoryScore + practiceScore,
        };
      }),
    );

    return result
      .sort((a, b) => a.branchName.localeCompare(b.branchName))
      .map((item, index) => ({ ...item, place: index + 1 }));
  }
  private calculateStageScore(data: {
    timeScore: number;
    hydraulicTest: boolean;
    safetyPenalty: number;
    culturePenalty: number;
    qualityPenalty: number;
  }): number {
    if (!data.hydraulicTest) return 0;
    const score =
      data.timeScore -
      data.safetyPenalty -
      data.culturePenalty -
      data.qualityPenalty;
    return Math.max(0, score);
  }

  private getScoreRangeForStage(taskNumber: number): [number, number] {
    switch (taskNumber) {
      case 1:
        return [60, 30]; // 1 этап: 60-30 баллов
      case 2:
        return [100, 50]; // 2 этап: 100-50 баллов
      case 3:
        return [80, 40]; // 3 этап: 80-40 баллов
      default:
        return [60, 30]; // По умолчанию
    }
  }

  async getTheoryScore(
    branch: Branch,
    practicNominationId: number,
    theoryNominationId: number,
  ) {
    const theoryResults = await this.prisma.testResult.findMany({
      where: {
        user: {
          participatingNominations: {
            has: practicNominationId,
          },
          branch: {
            address: branch.address,
          },
        },
        nomination: {
          id: theoryNominationId,
        },
      },
    });
    return theoryResults.length != 0
      ? theoryResults.reduce((sum, elem) => (sum += elem.score), 0)
      : 0;
  }

  private calculateTimeScore(
    currentTime: string,
    bestTime: string,
    worstTime: string,
    maxScore: number,
    minScore: number,
  ): number {
    const currentSeconds = this.timeToSeconds(currentTime);
    const bestSeconds = this.timeToSeconds(bestTime);
    const worstSeconds = this.timeToSeconds(worstTime);

    // Если все участники показали одинаковое время
    if (bestSeconds === worstSeconds) {
      return maxScore;
    }

    // Линейная интерполяция между лучшим и худшим временем
    const score =
      maxScore -
      ((currentSeconds - bestSeconds) * (maxScore - minScore)) /
        (worstSeconds - bestSeconds);

    // Гарантируем, что баллы в пределах диапазона (без округления)
    return Number(Math.max(minScore, Math.min(maxScore, score)).toFixed(2));
  }
}
