// truck-driver.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateTruckDriverTaskDto } from './dto/truck-driver.dto';

@Injectable()
export class TruckDriverService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший водитель автомобиля (грузового)' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Водитель автомобиля (грузового)' },
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
    for (const user of users) {
      const results = await this.prisma.truckDriverTask.findFirst({
        where: {
          userId: user.id,
          nominationId: nomination.id,
        },
      });

      result.push({
        branchName: user.branch.address,
        fullName: user.fullName,
        theoryScore: results.theoryPoints || 0,
        practiceScore: results.practicePoints || 0,
        totalScore: results.totalPoints,
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

  async updateTask(dto: UpdateTruckDriverTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (грузового)' },
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

    const updateData = {
      practicePenalty: dto.practicePenalty ?? 0,
      practiceTime: dto.practiceTime ?? '00:00',
    };

    const createData = {
      ...updateData,
      userId: dto.userId,
      branchId: user.branchId,
      nominationId: nomination.id,
      theoryCorrect: 0,
      theoryTime: '00:00',
      theoryPlace: null,
      theoryPoints: null,
      practiceSum: null,
      practicePlace: null,
      practicePoints: null,
      totalTheoryPoints: null,
      totalPracticePoints: null,
      totalPoints: null,
      finalPlace: null,
    };

    return this.prisma.truckDriverTask.upsert({
      where: {
        truck_driver_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
      update: updateData,
      create: createData,
    });
  }

  async calculateResults() {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (грузового)' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший водитель автомобиля (грузового)' },
    });

    if (!nomination || !practicNomination) {
      throw new Error('Номинация не найдена');
    }

    // Get all participants with test results
    const participants = await this.prisma.user.findMany({
      where: {
        participatingNominations: {
          has: practicNomination.id,
        },
        TestResult: {
          some: {
            nominationId: nomination.id,
          },
        },
      },
      include: {
        branch: true,
        TestResult: {
          where: {
            nominationId: nomination.id,
          },
          orderBy: {
            finishedAt: 'desc',
          },
          take: 1,
        },
        TruckDriverTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    // 1. Calculate theory results (ПДД)
    const theoryResults = participants
      .filter((p) => p.TestResult.length > 0)
      .map((p) => ({
        userId: p.id,
        theoryCorrect: p.TestResult[0].score,
        theoryTime: p.TestResult[0].duration,
        user: p,
      }))
      .sort((a, b) => {
        // Sort by correct answers (desc), then by time (asc)
        if (b.theoryCorrect !== a.theoryCorrect) {
          return b.theoryCorrect - a.theoryCorrect;
        }
        return (
          this.timeToSeconds(a.theoryTime) - this.timeToSeconds(b.theoryTime)
        );
      })
      .map((res, index, array) => {
        const place = index + 1;
        // Points = (number of participants - place) + bonus points
        const points = array.length - place + this.getBonusPoints(place);
        return {
          ...res,
          theoryPlace: place,
          theoryPoints: points,
        };
      });

    // 2. Calculate practice results (маневрирование)
    const practiceResults = participants
      .filter((p) => p.TruckDriverTask.length > 0)
      .map((p) => {
        const task = p.TruckDriverTask[0];
        return {
          userId: p.id,
          practicePenalty: task.practicePenalty || 0,
          practiceTime: task.practiceTime || '00:00',
          practiceSum:
            this.timeToSeconds(task.practiceTime || '00:00') +
            (task.practicePenalty || 0),
          user: p,
        };
      })
      .sort((a, b) => a.practiceSum - b.practiceSum) // Sort by sum (asc)
      .map((res, index, array) => {
        const place = index + 1;
        // Points = (number of participants - place) + bonus points
        const points = array.length - place + this.getBonusPoints(place);
        return {
          ...res,
          practicePlace: place,
          practicePoints: points,
        };
      });

    // 3. Combine results
    const combinedResults = participants
      .map((p) => {
        const theory = theoryResults.find((t) => t.userId === p.id);
        const practice = practiceResults.find((pr) => pr.userId === p.id);

        const totalPoints =
          (theory?.theoryPoints || 0) + (practice?.practicePoints || 0);

        return {
          userId: p.id,
          branchId: p.branchId,
          branchName: p.branch?.address || '',
          participantName: p.fullName || `Участник ${p.id}`,
          number: p.number,
          // Theory
          theoryCorrect: theory?.theoryCorrect || 0,
          theoryTime: theory?.theoryTime || '00:00',
          theoryPlace: theory?.theoryPlace || null,
          theoryPoints: theory?.theoryPoints || 0,
          // Practice
          practicePenalty: practice?.practicePenalty || 0,
          practiceTime: practice?.practiceTime || '00:00',
          practiceSum: practice?.practiceSum || 0,
          practicePlace: practice?.practicePlace || null,
          practicePoints: practice?.practicePoints || 0,
          // Totals
          totalTheoryPoints: theory?.theoryPoints || 0,
          totalPracticePoints: practice?.practicePoints || 0,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints) // Sort by total points (desc)
      .map((res, index) => ({
        ...res,
        finalPlace: index + 1,
      }));

    // 4. Save results to database
    await Promise.all(
      combinedResults.map((res) => {
        this.prisma.truckDriverTask.upsert({
          where: {
            truck_driver_unique: {
              userId: res.userId,
              nominationId: nomination.id,
            },
          },
          update: {
            theoryCorrect: res.theoryCorrect,
            theoryTime: res.theoryTime,
            theoryPlace: res.theoryPlace,
            theoryPoints: res.theoryPoints,
            practicePenalty: res.practicePenalty,
            practiceTime: res.practiceTime,
            practiceSum: res.practiceSum,
            practicePlace: res.practicePlace,
            practicePoints: res.practicePoints,
            totalTheoryPoints: res.totalTheoryPoints,
            totalPracticePoints: res.totalPracticePoints,
            totalPoints: res.totalPoints,
            finalPlace: res.finalPlace,
          },
          create: {
            userId: res.userId,
            branchId: res.branchId,
            nominationId: nomination.id,
            theoryCorrect: res.theoryCorrect,
            theoryTime: res.theoryTime,
            theoryPlace: res.theoryPlace,
            theoryPoints: res.theoryPoints,
            practicePenalty: res.practicePenalty,
            practiceTime: res.practiceTime,
            practiceSum: res.practiceSum,
            practicePlace: res.practicePlace,
            practicePoints: res.practicePoints,
            totalTheoryPoints: res.totalTheoryPoints,
            totalPracticePoints: res.totalPracticePoints,
            totalPoints: res.totalPoints,
            finalPlace: res.finalPlace,
          },
        });
        console.log('Saving data:', {
          userId: res.userId,
          theoryTime: res.theoryTime?.substring(0, 5),
          practiceTime: res.practiceTime?.substring(0, 5),
        });
      }),
    );

    return combinedResults;
  }

  private getBonusPoints(place: number): number {
    return place === 1 ? 3 : place === 2 ? 1 : 0;
  }

  async getTable() {
    await this.calculateResults();

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (грузового)' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    const result = [];

    const tasks = await this.prisma.truckDriverTask.findMany({
      where: { nominationId: nomination.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            branch: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { finalPlace: 'asc' },
    });

    for (const task of tasks) {
      result.push({
        id: task.id,
        nominationId: task.nominationId,
        theory: {
          correct: task.theoryCorrect,
          time: task.theoryTime,
          place: task.theoryPlace,
          points: task.theoryPoints,
        },
        practice: {
          penalty: task.practicePenalty,
          time: task.practiceTime,
          sum: task.practiceSum,
          place: task.practicePlace,
          points: task.practicePoints,
        },
        result: {
          theoryPoints: task.totalTheoryPoints,
          practicePoints: task.totalPracticePoints,
          points: task.totalPoints,
          place: task.finalPlace,
        },
        user: {
          id: task.user.id,
          fullName: task.user.fullName,
        },
        branch: {
          id: task.user.branch.id,
          address: task.user.branch.address,
        },
      });
    }

    return result;
  }
}
