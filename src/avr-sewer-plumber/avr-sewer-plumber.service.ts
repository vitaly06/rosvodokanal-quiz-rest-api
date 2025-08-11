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

  private calculateTimeScore(timeSeconds: number, allTimes: number[]): number {
    if (allTimes.length === 0) return 50; // Если нет других участников - макс балл

    // Уникальные времена (на случай одинаковых результатов)
    const uniqueTimes = [...new Set(allTimes)].sort((a, b) => a - b);
    const participantCount = uniqueTimes.length;

    // Диапазон баллов (50-25)
    const maxScore = 50;
    const minScore = 25;

    // Находим индекс текущего времени (место участника)
    const place = uniqueTimes.indexOf(timeSeconds) + 1;

    // Если участник всего один - даем ему максимальный балл
    if (participantCount === 1) {
      return maxScore;
    }

    // Если это худший результат - ставим минимальный балл
    if (place === participantCount) {
      return minScore;
    }

    // Для остальных рассчитываем баллы по убывающей
    return Math.round(
      maxScore - ((maxScore - minScore) / (participantCount - 1)) * (place - 1),
    );
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

    const timeSeconds = this.timeToSeconds(dto.time);

    // Получаем все времена для расчета баллов
    const allTasks = await this.prisma.avrSewerPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });
    const allTimes = allTasks
      .map((t) => this.timeToSeconds(t.time))
      .filter((t) => t > 0);

    if (timeSeconds > 0) {
      allTimes.push(timeSeconds);
    }

    const timeScore = this.calculateTimeScore(timeSeconds, allTimes);
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

    // Получаем все времена для расчета баллов
    const allTasks = await this.prisma.avrSewerPlumberTask.findMany({
      where: { nominationId: nomination.id },
    });
    const allTimes = allTasks
      .map((t) => this.timeToSeconds(t.time))
      .filter((t) => t > 0);

    const tableData = participants.map((user) => {
      const task = user.AvrSewerPlumberTask[0] || null;

      const timeScore = task
        ? this.calculateTimeScore(this.timeToSeconds(task.time), allTimes)
        : 0;

      const stageScore = task
        ? this.calculateStageScore(
            timeScore,
            task.hydraulicTest,
            task.safetyPenalty,
            task.culturePenalty,
            task.qualityPenalty,
          )
        : 0;
      return {
        branchId: user.branchId,
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
        stageScore,
        total: stageScore,
      };
    });

    // Сортируем по убыванию баллов
    return tableData
      .sort((a, b) => b.stageScore - a.stageScore)
      .map((item, index) => ({
        ...item,
        place: index + 1,
      }));
  }
}
