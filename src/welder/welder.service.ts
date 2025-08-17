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

      practicResults = await this.prisma.welderTask.findMany({
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

  private calculateStageScore(
    timeScore: number,
    culturePenalty: number,
    safetyPenalty: number,
    operationalControl: number,
    visualMeasurement: number,
    radiographicControl: number,
  ): number {
    return Math.max(
      0,
      timeScore -
        culturePenalty -
        safetyPenalty -
        operationalControl -
        visualMeasurement -
        radiographicControl,
    );
  }

  async updateTask(dto: UpdateWelderTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Сварщик' },
    });

    const timeSeconds = this.timeToSeconds(dto.time);
    const timeScore = this.calculateTimeScore(timeSeconds, dto.taskNumber);
    const stageScore = this.calculateStageScore(
      timeScore,
      dto.culturePenalty ?? 0,
      dto.safetyPenalty ?? 0,
      dto.operationalControl ?? 0,
      dto.visualMeasurement ?? 0,
      dto.radiographicControl ?? 0,
    );

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
        stageScore,
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
        stageScore,
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

    const branches = await this.prisma.branch.findMany();
    const testResults = await this.prisma.testResult.findMany({
      where: {
        nominationId: nomination.id,
        user: {
          participatingNominations: {
            has: practicNomination.id,
          },
        },
      },
      include: {
        user: {
          include: {
            branch: true,
          },
        },
      },
    });

    const welderTasks = await this.prisma.welderTask.findMany({
      where: {
        nominationId: nomination.id,
      },
    });
    const result = await Promise.all(
      branches
        .map((branch) => {
          const branchParticipants = testResults
            .filter((result) => result.user?.branchId === branch.id)
            .map((result) => result.user);

          if (branchParticipants.length === 0) {
            return {
              branchId: branch.id,
              branchName: branch.address,
              participantName: 'Нет данных',
              stages: [this.createEmptyStage(1), this.createEmptyStage(2)],
              total: 0,
            };
          }

          return branchParticipants.map(async (user) => {
            const participantTasks = welderTasks.filter(
              (task) => task.userId === user.id,
            );

            const stages = [1, 2].map((taskNumber) => {
              const task =
                participantTasks.find((t) => t.taskNumber === taskNumber) ||
                this.createEmptyStage(taskNumber);

              return {
                taskNumber,
                time: task.time || '00:00',
                timeScore: task.timeScore,
                hydraulicTest: false,
                safetyPenalty: task.safetyPenalty,
                culturePenalty: task.culturePenalty,
                qualityPenalty: 0,
                stageScore: task.stageScore,
              };
            });

            const lineNumber = await this.prisma.userLineNumber.findUnique({
              where: {
                user_practic_line_unique: {
                  userId: user.id,
                  practicNominationId: practicNomination.id,
                },
              },
            });

            const practiceScore = stages.reduce(
              (sum, stage) => sum + stage.stageScore,
              0,
            );

            const theoryScore = await this.getTheoryScore(
              user.id,
              nomination.id,
            );

            return {
              branchId: branch.id,
              practicNominationId: practicNomination.id,
              lineNumber: lineNumber?.lineNumber || null,
              branchName: branch.address,
              userId: user.id,
              participantName: user.fullName || 'Неизвестный участник',
              stages,
              theoryScore,
              practiceScore,
              total: theoryScore + practiceScore,
            };
          });
        })
        .flat(),
    );

    return result
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        place: index + 1,
      }));
  }

  private createEmptyStage(taskNumber: number): any {
    return {
      taskNumber,
      time: '00:00',
      timeScore: taskNumber == 1 ? 40 : 70,
      hydraulicTest: false,
      safetyPenalty: 0,
      culturePenalty: 0,
      qualityPenalty: 0,
      stageScore: 0,
    };
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
