import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateChemLabTechnicianDto } from './dto/chem-lab-technician.dto';

@Injectable()
export class ChemLabTechnicianService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший лаборант химического анализа' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Лаборант химического анализа' },
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

      practicResults = await this.prisma.chemLabTechnician.findFirst({
        where: { userId: user.id, nominationId: nomination.id },
      });

      result.push({
        branchName: user.branch.address,
        fullName: user.fullName,
        theoryScore: theoryResults[0].score || 0,
        practiceScore: practicResults?.totalPoints || 0,
        totalScore:
          (theoryResults[0].score || 0) + (practicResults?.totalPoints || 0),
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
    timeSeconds: number,
    allTimes: number[],
    maxScore: number,
    minScore: number,
  ): number {
    if (allTimes.length === 0) return maxScore;

    // Уникальные времена (на случай одинаковых результатов)
    const uniqueTimes = [...new Set(allTimes)].sort((a, b) => a - b);
    const participantCount = uniqueTimes.length;

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

  async updateTask(dto: UpdateChemLabTechnicianDto) {
    console.log(`dto: ${dto.stage1aTime}`);
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Лаборант химического анализа' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { branch: true },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    return this.prisma.chemLabTechnician.upsert({
      where: {
        chem_lab_technician_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
      update: {
        ...(dto.stage1aTime && { stage1aTime: dto.stage1aTime }),
        ...(dto.stage1aQuality && { stage1aQuality: dto.stage1aQuality }),
        ...(dto.stage1aCulture && { stage1aCulture: dto.stage1aCulture }),
        ...(dto.stage1aSafety && { stage1aSafety: dto.stage1aSafety }),

        ...(dto.stage1bTime && { stage1bTime: dto.stage1bTime }),
        ...(dto.stage1bQuality && { stage1bQuality: dto.stage1bQuality }),
        ...(dto.stage1bCulture && { stage1bCulture: dto.stage1bCulture }),
        ...(dto.stage1bSafety && { stage1bSafety: dto.stage1bSafety }),

        ...(dto.stage2Time && { stage2Time: dto.stage2Time }),
        ...(dto.stage2Quality && { stage2Quality: dto.stage2Quality }),
        ...(dto.stage2Culture && { stage2Culture: dto.stage2Culture }),
        ...(dto.stage2Safety && { stage2Safety: dto.stage2Safety }),
      },
      create: {
        userId: dto.userId,
        branchId: user.branchId,
        nominationId: nomination.id,
        stage1aTime: dto.stage1aTime ?? '00:00',
        stage1aQuality: dto.stage1aQuality ?? 0,
        stage1aCulture: dto.stage1aCulture ?? 0,
        stage1aSafety: dto.stage1aSafety ?? 0,

        stage1bTime: dto.stage1bTime ?? '00:00',
        stage1bQuality: dto.stage1bQuality ?? 0,
        stage1bCulture: dto.stage1bCulture ?? 0,
        stage1bSafety: dto.stage1bSafety ?? 0,

        stage2Time: dto.stage2Time ?? '00:00',
        stage2Quality: dto.stage2Quality ?? 0,
        stage2Culture: dto.stage2Culture ?? 0,
        stage2Safety: dto.stage2Safety ?? 0,
      },
    });
  }

  async calculateResults() {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Лаборант химического анализа' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший лаборант химического анализа' },
    });

    if (!nomination || !practicNomination) {
      throw new Error('Номинация не найдена');
    }

    const tasks = await this.prisma.chemLabTechnician.findMany({
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

    // Собираем времена для каждого этапа
    const stage1aTimes = tasks
      .filter((t) => t.stage1aTime !== '00:00')
      .map((t) => this.timeToSeconds(t.stage1aTime));

    const stage1bTimes = tasks
      .filter((t) => t.stage1bTime !== '00:00')
      .map((t) => this.timeToSeconds(t.stage1bTime));

    const stage2Times = tasks
      .filter((t) => t.stage2Time !== '00:00')
      .map((t) => this.timeToSeconds(t.stage2Time));

    // Рассчитываем результаты для каждого участника
    const results = tasks.map((task) => {
      // Этап 1a
      const stage1aTimeScore =
        task.stage1aTime !== '00:00'
          ? this.calculateTimeScore(
              this.timeToSeconds(task.stage1aTime),
              stage1aTimes,
              40, // Максимальный балл
              20, // Минимальный балл
            )
          : 0;

      const stage1aTotal = Math.max(
        0,
        stage1aTimeScore -
          task.stage1aQuality -
          task.stage1aCulture -
          task.stage1aSafety,
      );

      // Этап 1b
      const stage1bTimeScore =
        task.stage1bTime !== '00:00'
          ? this.calculateTimeScore(
              this.timeToSeconds(task.stage1bTime),
              stage1bTimes,
              60, // Максимальный балл
              40, // Минимальный балл
            )
          : 0;

      const stage1bTotal = Math.max(
        0,
        stage1bTimeScore -
          task.stage1bQuality -
          task.stage1bCulture -
          task.stage1bSafety,
      );

      // Этап 2
      const stage2TimeScore =
        task.stage2Time !== '00:00'
          ? this.calculateTimeScore(
              this.timeToSeconds(task.stage2Time),
              stage2Times,
              100, // Максимальный балл
              60, // Минимальный балл
            )
          : 0;

      const stage2Total = Math.max(
        0,
        stage2TimeScore -
          task.stage2Quality -
          task.stage2Culture -
          task.stage2Safety,
      );

      // Итоговый балл
      const totalPoints = stage1aTotal + stage1bTotal + stage2Total;

      return {
        ...task,
        stage1aTimeScore,
        stage1aTotal,
        stage1bTimeScore,
        stage1bTotal,
        stage2TimeScore,
        stage2Total,
        totalPoints,
      };
    });

    // Сортируем по убыванию итоговых баллов
    const sortedResults = results
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .map((result, index) => ({
        ...result,
        finalPlace: index + 1,
      }));

    // Сохраняем результаты в БД
    await Promise.all(
      sortedResults.map((result) =>
        this.prisma.chemLabTechnician.update({
          where: { id: result.id },
          data: {
            stage1aTimeScore: result.stage1aTimeScore,
            stage1aTotal: result.stage1aTotal,
            stage1bTimeScore: result.stage1bTimeScore,
            stage1bTotal: result.stage1bTotal,
            stage2TimeScore: result.stage2TimeScore,
            stage2Total: result.stage2Total,
            totalPoints: result.totalPoints,
            finalPlace: result.finalPlace,
          },
        }),
      ),
    );

    return sortedResults;
  }

  async getTable() {
    await this.calculateResults();

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Лаборант химического анализа' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший лаборант химического анализа' },
    });

    if (!nomination || !practicNomination) {
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
        ChemLabTechnician: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    return participants
      .map((participant) => {
        const task = participant.ChemLabTechnician[0] || null;

        return {
          id: task?.id || null,
          userId: participant.id,
          branchId: participant.branchId,
          branchName: participant.branch.address,
          participantName: participant.fullName || `Участник ${participant.id}`,
          number: participant.number,
          stages: [
            {
              name: '1a',
              time: task?.stage1aTime || '00:00',
              timeScore: task?.stage1aTimeScore || 0,
              quality: task?.stage1aQuality || 0,
              culture: task?.stage1aCulture || 0,
              safety: task?.stage1aSafety || 0,
              total: task?.stage1aTotal || 0,
            },
            {
              name: '1b',
              time: task?.stage1bTime || '00:00',
              timeScore: task?.stage1bTimeScore || 0,
              quality: task?.stage1bQuality || 0,
              culture: task?.stage1bCulture || 0,
              safety: task?.stage1bSafety || 0,
              total: task?.stage1bTotal || 0,
            },
            {
              name: '2',
              time: task?.stage2Time || '00:00',
              timeScore: task?.stage2TimeScore || 0,
              quality: task?.stage2Quality || 0,
              culture: task?.stage2Culture || 0,
              safety: task?.stage2Safety || 0,
              total: task?.stage2Total || 0,
            },
          ],
          totalPoints: task?.totalPoints || 0,
          finalPlace: task?.finalPlace || null,
        };
      })
      .sort((a, b) => (a.finalPlace || Infinity) - (b.finalPlace || Infinity));
  }
}
