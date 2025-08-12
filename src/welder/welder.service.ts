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

  private getTimeScoreRange(taskNumber: number): { max: number; min: number } {
    return taskNumber === 1
      ? { max: 40, min: 20 } // Для этапа 1: 40-20 баллов
      : { max: 70, min: 35 }; // Для этапа 2: 70-35 баллов
  }

  private calculateTimeScore(
    timeSeconds: number,
    taskNumber: number,
    allTimes: number[],
  ): number {
    if (allTimes.length === 0) return this.getTimeScoreRange(taskNumber).max;

    const { max: maxScore, min: minScore } = this.getTimeScoreRange(taskNumber);
    const uniqueTimes = [...new Set(allTimes)].sort((a, b) => a - b);
    const participantCount = uniqueTimes.length;

    // Находим место участника
    const place = uniqueTimes.indexOf(timeSeconds) + 1;

    // Если участник один - максимальный балл
    if (participantCount === 1) {
      return maxScore;
    }

    // Если худший результат - минимальный балл
    if (place === participantCount) {
      return minScore;
    }

    // Для остальных - расчет по формуле
    return Math.round(
      maxScore - ((maxScore - minScore) / (participantCount - 1)) * (place - 1),
    );
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

    // Получаем все времена для текущего этапа
    const allTasks = await this.prisma.welderTask.findMany({
      where: {
        nominationId: nomination.id,
        taskNumber: dto.taskNumber,
      },
    });
    const allTimes = allTasks
      .map((t) => this.timeToSeconds(t.time))
      .filter((t) => t > 0);

    const timeSeconds = this.timeToSeconds(dto.time);
    if (timeSeconds > 0) {
      allTimes.push(timeSeconds);
    }

    const timeScore = this.calculateTimeScore(
      timeSeconds,
      dto.taskNumber,
      allTimes,
    );
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

    // Получаем все задачи для расчета относительных баллов
    const allTasks = await this.prisma.welderTask.findMany({
      where: { nominationId: nomination.id },
    });

    const branches = await this.prisma.branch.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
      },
    });
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

    const result = branches
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

        return branchParticipants.map((user) => {
          const participantTasks = allTasks.filter(
            (task) => task.userId === user.id,
          );

          const stages = [1, 2].map((taskNumber) => {
            // Получаем все времена для текущего этапа
            const stageTimes = allTasks
              .filter((t) => t.taskNumber === taskNumber)
              .map((t) => this.timeToSeconds(t.time))
              .filter((t) => t > 0);

            const task =
              participantTasks.find((t) => t.taskNumber === taskNumber) ||
              this.createEmptyStage(taskNumber);

            const timeScore =
              task.time && task.time !== '00:00'
                ? this.calculateTimeScore(
                    this.timeToSeconds(task.time),
                    taskNumber,
                    stageTimes,
                  )
                : 0;

            const stageScore =
              task.time && task.time !== '00:00'
                ? this.calculateStageScore(
                    timeScore,
                    task.culturePenalty,
                    task.safetyPenalty,
                    task.operationalControl,
                    task.visualMeasurement,
                    task.radiographicControl,
                  )
                : 0;

            return {
              taskNumber,
              time: task.time || '00:00',
              timeScore,
              hydraulicTest: false,
              safetyPenalty: task.safetyPenalty,
              culturePenalty: task.culturePenalty,
              qualityPenalty: 0,
              stageScore,
            };
          });

          const total = stages.reduce(
            (sum, stage) => sum + stage.stageScore,
            0,
          );

          return {
            branchId: branch.id,
            branchName: branch.address,
            userId: user.id,
            participantName: user.fullName || 'Неизвестный участник',
            stages,
            total,
          };
        });
      })
      .flat();

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
      timeScore: 0,
      hydraulicTest: false,
      safetyPenalty: 0,
      culturePenalty: 0,
      qualityPenalty: 0,
      stageScore: 0,
    };
  }
}
