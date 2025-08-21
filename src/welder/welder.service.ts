import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateWelderTaskDto } from './dto/welder-task.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WelderService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший сварщик' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Сварщик' },
    });

    const users = await this.prisma.user.findMany({
      where: {
        fullName: {
          participatingNominations: {
            has: practicNomination.id,
          },
        },
      },
      include: {
        fullName: { include: { branch: true } },
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

      practicResults = await this.prisma.welderTask.findMany({
        where: { userId: user.id },
      });

      result.push({
        branchName: user.fullName.branch.address,
        fullName: user.fullName.fullName,
        theoryScore: theoryResults[0]?.score || 0,
        practiceScore: practicResults.reduce(
          (sum, elem) => (sum += elem.stageScore),
          0,
        ),
        totalScore:
          (theoryResults[0]?.score || 0) +
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

  private secondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private calculateTimeScore(timeSeconds: number, taskNumber: number): number {
    // Нормативные времена для этапов (в секундах)
    const normTime = taskNumber === 1 ? 600 : 1200; // 10 или 20 минут
    const baseScore = taskNumber === 1 ? 40 : 70; // Базовые баллы для этапов

    // Разница с нормативным временем (в секундах)
    const timeDiff = timeSeconds - normTime;
    // Рассчитываем изменение баллов (каждые 30 секунд = 1 балл)
    const scoreChange =
      timeDiff >= 0 ? Math.floor(timeDiff / 30) : Math.ceil(timeDiff / 30);
    // Итоговые баллы (не может быть меньше 0)
    return Math.max(0, baseScore - scoreChange);
  }

  // private calculateStageScore(
  //   timeScore: number,
  //   culturePenalty: number,
  //   safetyPenalty: number,
  //   operationalControl: number,
  //   visualMeasurement: number,
  //   radiographicControl: number,
  // ): number {
  //   return Math.max(
  //     0,
  //     timeScore -
  //       culturePenalty -
  //       safetyPenalty -
  //       operationalControl -
  //       visualMeasurement -
  //       radiographicControl,
  //   );
  // }

  async updateTask(dto: UpdateWelderTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Сварщик' },
    });

    const timeSeconds = this.timeToSeconds(dto.time);
    const timeScore = this.calculateTimeScore(timeSeconds, dto.taskNumber);

    return this.prisma.welderTask.upsert({
      where: {
        welder_unique_task: {
          branchId: dto.branchId,
          nominationId: nomination.id,
          taskNumber: dto.taskNumber,
          userId: dto.userId,
        },
      },
      update: {
        time: dto.time,
        timeScore,
        culturePenalty: dto.culturePenalty,
        safetyPenalty: dto.safetyPenalty,
        operationalControl: dto.operationalControl,
        visualMeasurement: dto.visualMeasurement,
        radiographicControl: dto.radiographicControl,
        stageScore: timeScore - dto.culturePenalty - dto.safetyPenalty,
      },
      create: {
        branchId: dto.branchId,
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
        userId: dto.userId,
        time: dto.time,
        timeScore,
        culturePenalty: dto.culturePenalty ?? 0,
        safetyPenalty: dto.safetyPenalty ?? 0,
        operationalControl: dto.operationalControl ?? 0,
        visualMeasurement: dto.visualMeasurement ?? 0,
        radiographicControl: dto.radiographicControl ?? 0,
        stageScore: timeScore - dto.culturePenalty - dto.safetyPenalty,
      },
    });
  }

  async getTable() {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Сварщик' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший сварщик' },
    });

    if (!nomination) {
      throw new Error('Номинация "Сварщик" не найдена');
    }

    if (!practicNomination) {
      throw new Error('Практическая номинация "Лучший сварщик" не найдена');
    }

    // Получаем всех пользователей, у которых в fullName.participatingNominations есть practicNomination.id
    const users = await this.prisma.user.findMany({
      where: {
        fullName: {
          participatingNominations: {
            has: practicNomination.id,
          },
        },
      },
      include: {
        fullName: {
          include: {
            branch: true,
          },
        },
      },
    });

    // Получаем testResults для всех пользователей из выборки
    const testResults = await this.prisma.testResult.findMany({
      where: {
        nominationId: nomination.id,
        userId: {
          in: users.map((user) => user.id),
        },
      },
      include: {
        user: {
          include: {
            fullName: { include: { branch: true } },
          },
        },
      },
    });

    const welderTasks = await this.prisma.welderTask.findMany({
      where: {
        nominationId: nomination.id,
        userId: {
          in: users.map((user) => user.id),
        },
      },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        // Находим testResult для текущего пользователя
        const userTestResult = testResults.find(
          (result) => result.userId === user.id,
        );

        // Находим задачи для текущего пользователя
        const participantTasks = welderTasks.filter(
          (task) => task.userId === user.id,
        );

        const stages = [1, 2].map((taskNumber) => {
          const task =
            participantTasks.find((t) => t.taskNumber === taskNumber) ||
            this.createEmptyStage(taskNumber);

          if (taskNumber === 1) {
            return {
              taskNumber,
              time: task.time || '00:00',
              timeScore: task.timeScore || 0,
              hydraulicTest: false,
              safetyPenalty: task.safetyPenalty || 0,
              culturePenalty: task.culturePenalty || 0,
              qualityPenalty: 0,
              stageScore: task.stageScore || 0,
              operationalControl: task.operationalControl || 0,
              visualMeasurement: task.visualMeasurement || 0,
              radiographicControl: task.radiographicControl || 0,
            };
          }

          return {
            taskNumber,
            time: task.time || '00:00',
            timeScore: task.timeScore || 0,
            hydraulicTest: false,
            safetyPenalty: task.safetyPenalty || 0,
            culturePenalty: task.culturePenalty || 0,
            qualityPenalty: 0,
            stageScore: task.stageScore || 0,
          };
        });

        // Получаем номер линии для пользователя
        const lineNumber = await this.prisma.userLineNumber.findUnique({
          where: {
            user_practic_line_unique: {
              userId: user.id,
              practicNominationId: practicNomination.id,
            },
          },
        });
        // Рассчитываем практический балл
        const practiceScore = Math.max(
          0,
          stages.reduce((sum, stage) => sum + (stage.stageScore || 0), 0) -
            stages.reduce(
              (sum, stage) =>
                sum +
                ((stage.operationalControl || 0) +
                  (stage.visualMeasurement || 0) +
                  (stage.radiographicControl || 0)),
              0,
            ),
        );

        // Получаем теоретический балл
        const theoryScore = await this.getTheoryScore(
          String(user.id),
          String(nomination.id),
        );

        return {
          branchId: user.fullName.branch?.id || null,
          practicNominationId: practicNomination.id,
          lineNumber: lineNumber?.lineNumber || null,
          branchName: user.fullName.branch?.address || 'Неизвестный филиал',
          userId: user.id,
          participantName: user.fullName.fullName || 'Неизвестный участник',
          stages,
          totalStages: stages
            .reduce((sum, stage) => sum + stage.stageScore || 0, 0)
            .toFixed(2),
          theoryScore: theoryScore || 0,
          practiceScore,
          total: (theoryScore || 0) + practiceScore,
        };
      }),
    );

    // Сортируем по убыванию общего балла и добавляем места
    const sortedResult = result
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({ ...item, place: index + 1 }));

    // Дополнительная сортировка по имени участника
    return sortedResult.sort((a, b) =>
      a.participantName.localeCompare(b.participantName),
    );
  }

  private createEmptyStage(taskNumber: number): any {
    const baseData = {
      taskNumber,
      time: '00:00',
      timeScore: taskNumber === 1 ? 40 : 70,
      hydraulicTest: false,
      safetyPenalty: 0,
      culturePenalty: 0,
      qualityPenalty: 0,
      stageScore: taskNumber === 1 ? 40 : 70,
    };

    if (taskNumber === 1) {
      return {
        ...baseData,
        operationalControl: 0,
        visualMeasurement: 0,
        radiographicControl: 0,
      };
    }

    return baseData;
  }

  private async getTheoryScore(userId: string, nominationId: string) {
    try {
      const testResult = await this.prisma.testResult.findFirst({
        where: {
          userId: +userId,
          nominationId: +nominationId,
        },
        select: {
          score: true,
        },
      });

      return testResult?.score || 0;
    } catch (error) {
      console.error('Error getting theory score:', error);
      return 0;
    }
  }

  // private createEmptyStage(taskNumber: number): any {
  //   const returnedData = {
  //     taskNumber,
  //     time: '00:00',
  //     timeScore: taskNumber == 1 ? 40 : 70,
  //     hydraulicTest: false,
  //     safetyPenalty: 0,
  //     culturePenalty: 0,
  //     qualityPenalty: 0,
  //     stageScore: taskNumber == 1 ? 40 : 70,
  //   };
  //   if (taskNumber == 1) {
  //     returnedData['operationalControl'] = 0;
  //     returnedData['visualMeasurement'] = 0;
  //     returnedData['radiographicControl'] = 0;
  //   }

  //   return returnedData;
  // }

  // async getTheoryScore(userId: number, nominationId: number) {
  //   const theoryResults = await this.prisma.testResult.findMany({
  //     where: {
  //       userId,
  //       nominationId,
  //     },
  //   });

  //   return theoryResults[0].score || 0;
  // }
}
