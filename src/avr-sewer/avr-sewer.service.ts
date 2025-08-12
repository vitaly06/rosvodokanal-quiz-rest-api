import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAvrSewerTaskDto } from './dto/avr-sewer-task.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AvrSewerService {
  constructor(private prisma: PrismaService) {}

  private timeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  async getResultTable() {
    let result = [];
    // Практическая номинация
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучшая бригада АВР на канализационных сетях' },
    });

    // Теоретическая номинация
    const theoryNomination = await this.prisma.nomination.findUnique({
      where: { name: 'Слесарь АВР' },
    });

    const branchs = await this.prisma.branch.findMany({
      where: {
        participatingNominations: { has: practicNomination.id },
      },
    });
    let practicResults;
    let theoryResults;
    for (const branch of branchs) {
      practicResults = await this.prisma.avrSewerTask.findMany({
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

      result = result.sort((a, b) => b.totalScore - a.totalScore);
    }
    for (let i = 0; i < result.length; i++) {
      result[i].place = i + 1;
    }

    return result;
  }

  private secondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async updateTask(dto: UpdateAvrSewerTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    // Получаем все записи для текущего этапа
    const allTasksForStage = await this.prisma.avrSewerTask.findMany({
      where: {
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
        NOT: { time: '00:00' },
      },
    });

    // Собираем все времена (в секундах)
    const times = allTasksForStage
      .map((t) => this.timeToSeconds(t.time))
      .filter((t) => t > 0);

    const timeSeconds = this.timeToSeconds(dto.time);
    if (timeSeconds > 0) {
      times.push(timeSeconds);
    }

    // Рассчитываем баллы за время
    const timeScore = this.calculateTimeScore(
      timeSeconds,
      times,
      dto.taskNumber,
    );

    // Если гидравлическое испытание не пройдено, баллы за этап = 0
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

  private calculateTimeScore(
    timeSeconds: number,
    allTimes: number[],
    taskNumber: number,
  ): number {
    if (allTimes.length === 0) {
      // Если нет других участников, возвращаем максимальный балл
      return this.getScoreRangeForStage(taskNumber).best;
    }

    const { best: maxScore, worst: minScore } =
      this.getScoreRangeForStage(taskNumber);

    // Уникальные времена (на случай одинаковых результатов)
    const uniqueTimes = [...new Set(allTimes)].sort((a, b) => a - b);
    const participantCount = uniqueTimes.length;

    // Если участник всего один - даем ему максимальный балл
    if (participantCount === 1) {
      return maxScore;
    }

    // Находим индекс текущего времени (место участника)
    const place = uniqueTimes.indexOf(timeSeconds) + 1;

    // Если это худший результат - ставим минимальный балл
    if (place === participantCount) {
      return minScore;
    }

    // Для остальных рассчитываем баллы по убывающей
    return Math.round(
      maxScore - ((maxScore - minScore) / (participantCount - 1)) * (place - 1),
    );
  }

  private getScoreRangeForStage(taskNumber: number): {
    best: number;
    worst: number;
  } {
    const stageParams = {
      1: { best: 50, worst: 25 }, // Этап 1: 50-25 баллов
      2: { best: 80, worst: 60 }, // Этап 2: 80-60 баллов
      3: { best: 100, worst: 50 }, // Этап 3: 100-50 баллов
      4: { best: 80, worst: 60 }, // Этап 4: 80-60 баллов
    };

    return stageParams[taskNumber] || { best: 50, worst: 25 };
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
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Слесарь АВР' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    const branches = await this.prisma.branch.findMany();
    const tasks = await this.prisma.avrSewerTask.findMany({
      where: { nominationId: nomination.id },
    });

    // Пересчитываем баллы для всех задач по новой формуле
    for (let stage = 1; stage <= 4; stage++) {
      const stageTasks = tasks.filter(
        (t) => t.taskNumber === stage && t.time !== '00:00',
      );

      if (stageTasks.length > 0) {
        const times = stageTasks.map((t) => this.timeToSeconds(t.time));
        const { best: maxScore, worst: minScore } =
          this.getScoreRangeForStage(stage);

        // Уникальные времена
        const uniqueTimes = [...new Set(times)].sort((a, b) => a - b);
        const participantCount = uniqueTimes.length;

        for (const task of stageTasks) {
          const timeSec = this.timeToSeconds(task.time);
          const place = uniqueTimes.indexOf(timeSec) + 1;

          // Начисляем баллы по новой формуле
          if (participantCount === 1) {
            // Если участник один - максимальный балл
            task.timeScore = maxScore;
          } else if (place === participantCount) {
            // Если худший результат - минимальный балл
            task.timeScore = minScore;
          } else {
            // Для остальных - расчет по формуле
            task.timeScore = Math.round(
              maxScore -
                ((maxScore - minScore) / (participantCount - 1)) * (place - 1),
            );
          }

          task.stageScore = this.calculateStageScore(
            task.timeScore,
            task.safetyPenalty,
            task.culturePenalty,
            task.qualityPenalty,
          );
        }
      }
    }

    // Формируем таблицу
    const result = branches.map((branch) => {
      const branchTasks = tasks.filter((t) => t.branchId === branch.id);

      // Собираем данные по всем 4 этапам
      const stages = [1, 2, 3, 4].map((stageNum) => {
        const stageTask =
          branchTasks.find((t) => t.taskNumber === stageNum) ||
          this.createEmptyStage(stageNum);
        return {
          ...stageTask,
          timeDisplay: stageTask.time || '00:00',
        };
      });

      // Считаем общий балл
      const total = stages.reduce((sum, stage) => sum + stage.stageScore, 0);

      return {
        branchId: branch.id,
        branchName: branch.address,
        stages,
        total,
      };
    });

    // Сортируем по убыванию общего балла
    return result
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({ ...item, place: index + 1 }));
  }

  private createEmptyStage(taskNumber: number): any {
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
}
