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
            fullName: {
              participatingNominations: { has: practicNomination.id },
              branch: { address: branch.address },
            },
          },
          nomination: { id: theoryNomination.id },
        },
      });

      const team = await this.prisma.user.findMany({
        where: {
          fullName: {
            branch: { id: branch.id },
            participatingNominations: { has: practicNomination.id },
          },
        },
        include: {
          fullName: true,
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
        team: team.map((user) => user.fullName.fullName),
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
    bestTime: string,
    worstTime: string,
    maxScore: number,
    minScore: number,
  ): number {
    const currentSeconds = this.timeToSeconds(currentTime);
    const bestSeconds = this.timeToSeconds(bestTime);
    const worstSeconds = this.timeToSeconds(worstTime);

    console.log(currentSeconds, bestSeconds, worstSeconds);

    // Если текущее время - лучшее, возвращаем максимальный балл
    if (currentTime === bestTime) return maxScore;

    // Если текущее время - худшее, возвращаем минимальный балл
    if (currentTime === worstTime) return minScore;

    // Разница между максимальным и минимальным баллом
    const scoreRange = maxScore - minScore;
    // Разница между худшим и лучшим временем в секундах
    const timeRange = worstSeconds - bestSeconds;

    // Если все времена одинаковые (timeRange = 0), возвращаем средний балл
    if (timeRange === 0) {
      return (maxScore + minScore) / 2;
    }

    // Стоимость одной секунды в баллах
    const scorePerSecond = scoreRange / timeRange;
    // Разница между текущим и лучшим временем
    const timeDiff = currentSeconds - bestSeconds;
    // Расчет балла: minScore + (оставшееся время от худшего) * scorePerSecond
    const score = maxScore - timeDiff * scorePerSecond;

    // Гарантируем, что балл в пределах диапазона
    return Math.max(minScore, Math.min(maxScore, Number(score.toFixed(2))));
  }

  async updateTask(dto: UpdateAvrSewerTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    const branchExists = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branchExists) throw new Error('Филиал не найден');

    // Получаем все записи для текущего этапа
    const allTasksForStage = await this.prisma.avrSewerTask.findMany({
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

    let timeScore = 0;
    const [maxScore, minScore] = this.getScoreRangeForStage(dto.taskNumber);

    if (validTimes.length > 0) {
      // Сортируем времена от лучшего к худшему
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
      } else {
        // Если время не указано, ставим минимальный балл
        timeScore = minScore;
      }
    } else {
      // Если нет валидных времен, используем минимальный балл
      timeScore = minScore;
    }

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
        stageScore: +stageScore,
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
        stageScore: +stageScore,
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
  ) {
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

    for (let stage = 1; stage <= 4; stage++) {
      const stageTasks = allTasks.filter(
        (t) => t.taskNumber === stage && t.time !== '00:00',
      );

      if (stageTasks.length > 0) {
        const [maxScore, minScore] = this.getScoreRangeForStage(stage);

        // Сортируем задачи по времени (от лучшего к худшему)
        const sortedTasks = [...stageTasks].sort(
          (a, b) => this.timeToSeconds(a.time) - this.timeToSeconds(b.time),
        );

        // Рассчитываем баллы по ТОЙ ЖЕ методике, что и в AvrMechanic
        const bestTime = sortedTasks[0].time;
        const worstTime = sortedTasks[sortedTasks.length - 1].time;
        const scoreRange = maxScore - minScore;
        const timeRange =
          this.timeToSeconds(worstTime) - this.timeToSeconds(bestTime);

        sortedTasks.forEach((task, index) => {
          if (index === 0) {
            // Лучший результат - максимальный балл
            task.timeScore = maxScore;
          } else if (index === sortedTasks.length - 1) {
            // Худший результат - минимальный балл
            task.timeScore = minScore;
          } else {
            // Для промежуточных результатов используем линейную интерполяцию
            const currentSeconds = this.timeToSeconds(task.time);
            const bestSeconds = this.timeToSeconds(bestTime);

            // Линейная интерполяция: score = maxScore - (currentSeconds - bestSeconds) * (scoreRange / timeRange)
            const timeDiff = currentSeconds - bestSeconds;
            const scorePerSecond = timeRange > 0 ? scoreRange / timeRange : 0;
            task.timeScore = maxScore - timeDiff * scorePerSecond;
          }

          // Гарантируем, что балл в пределах диапазона
          task.timeScore = Math.max(
            minScore,
            Math.min(maxScore, Number(task.timeScore.toFixed(2))),
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

    let result = await Promise.all(
      branches.map(async (branch) => {
        const tasks = allTasks.filter((t) => t.branchId === branch.id);
        const stages = [1, 2, 3, 4].map(
          (stage) =>
            tasks.find((t) => t.taskNumber === stage) ||
            this.createEmptyStage(stage),
        );

        const practiceScore = stages.reduce(
          (sum, stage) => sum + +stage.stageScore,
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
          practicNominationId: practicNomination.id,
          branchId: branch.id,
          branchName: branch.address,
          lineNumber: lineNumber?.lineNumber ?? null,
          stages: stages.map((stage) => ({
            ...stage,
            timeScore:
              typeof stage.timeScore === 'number'
                ? stage.timeScore.toFixed(2)
                : stage.timeScore,
            stageScore:
              typeof stage.stageScore === 'number'
                ? stage.stageScore.toFixed(2)
                : stage.stageScore,
          })),
          practiceScore: practiceScore.toFixed(2),
          theoryScore: theoryScore.toFixed(2),
          total: (+practiceScore + +theoryScore).toFixed(2),
        };
      }),
    );

    result = result
      .sort((a, b) => +b.total - +a.total)
      .map((item, index) => ({ ...item, place: index + 1 }));

    return result.sort((a, b) => a.branchName.localeCompare(b.branchName));
  }

  private createEmptyStage(taskNumber: number) {
    return {
      taskNumber,
      time: '00:00',
      timeScore: '0.00',
      hydraulicTest: true,
      safetyPenalty: 0,
      culturePenalty: 0,
      qualityPenalty: 0,
      stageScore: '0.00',
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
          fullName: {
            participatingNominations: { has: practicNominationId },
            branch: { address: branch.address },
          },
        },
        nomination: { id: theoryNominationId },
      },
    });
    return results.reduce((sum, r) => sum + r.score, 0);
  }
}
