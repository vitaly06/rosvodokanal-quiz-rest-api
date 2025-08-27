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

    let theory;

    for (const user of users) {
      const results = await this.prisma.truckDriverTask.findFirst({
        where: {
          userId: user.id,
          nominationId: nomination.id,
        },
      });

      theory = await this.prisma.testResult.findMany({
        where: { nominationId: nomination.id, userId: user.id },
        select: {
          score: true,
        },
      });

      result.push({
        branchName: user.fullName.branch.address,
        fullName: user.fullName.fullName,
        theoryScore: theory.reduce((sum, elem) => (sum += elem.score), 0) || 0,
        practiceScore: results?.practicePoints || 0,
        totalScore:
          (theory.reduce((sum, elem) => (sum += elem.score), 0) || 0) +
          (results?.practicePoints || 0),
      });
    }

    result = result.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < result.length; i++) {
      result[i].place = i + 1;
    }

    return result;
  }

  private formatTimeToMMSS(timeString: string) {
    if (!timeString) {
      return '00:00';
    }

    if (timeString.includes(':')) {
      return timeString;
    }
    const minutesMatch = timeString.match(/(\d+)\s*мин/);
    const secondsMatch = timeString.match(/(\d+)\s*сек/);

    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  }

  private timeToSeconds(timeStr: string) {
    if (!timeStr) return 0;
    if (!timeStr.includes(':')) {
      timeStr = this.formatTimeToMMSS(timeStr);
    }
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
      include: { fullName: { include: { branch: true } } },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Проверяем и корректно обрабатываем practiceTime
    let practiceTime = '00:00';
    if (dto.practiceTime && dto.practiceTime.trim() !== '') {
      practiceTime = dto.practiceTime.trim();
    }

    // Проверяем и корректно обрабатываем practicePenalty
    let practicePenalty = 0;
    if (dto.practicePenalty !== undefined && dto.practicePenalty !== null) {
      practicePenalty = Number(dto.practicePenalty);
    }

    const practiceTimeSeconds = this.timeToSeconds(practiceTime);
    const practiceSum = practiceTimeSeconds + practicePenalty;

    const updateData = {
      practicePenalty: practicePenalty,
      practiceTime: practiceTime, // Используем обработанное значение
      practiceSum: practiceSum,
    };

    console.log('Update data:', updateData);

    const createData = {
      ...updateData,
      userId: dto.userId,
      branchId: user.fullName.branchId,
      nominationId: nomination.id,
      theoryCorrect: 0,
      theoryTime: '00:00',
      theoryPlace: null,
      theoryPoints: null,
      practicePlace: null,
      practicePoints: null,
      totalTheoryPoints: null,
      totalPracticePoints: null,
      totalPoints: null,
      finalPlace: null,
    };

    const result = await this.prisma.truckDriverTask.upsert({
      where: {
        truck_driver_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
      update: updateData,
      create: createData,
    });

    console.log('Result:', result);

    // Проверим что действительно записалось в БД
    const verify = await this.prisma.truckDriverTask.findUnique({
      where: {
        truck_driver_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
    });

    console.log('Verified in DB:', verify);
    return result;
  }

  private getBonusPoints(place: number): number {
    return place === 1 ? 3 : place === 2 ? 1 : 0;
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

    const participants = await this.prisma.user.findMany({
      where: {
        fullName: {
          participatingNominations: {
            has: practicNomination.id,
          },
        },
        TestResult: {
          some: { nominationId: nomination.id },
        },
      },
      include: {
        fullName: {
          include: {
            branch: true,
          },
        },
        TestResult: {
          where: {
            nominationId: nomination.id,
          },
          orderBy: {
            finishedAt: 'desc',
          },
        },
        TruckDriverTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    for (const parc of participants) {
      console.log(parc.fullName.fullName);
    }

    const theoryResults = participants
      .filter((p) => p.TestResult.length > 0)
      .map((p) => ({
        userId: p.id,
        theoryCorrect: p.TestResult[0].score || 0,
        theoryTime: p.TestResult[0].duration || '99:99',
        user: p,
      }))
      .sort((a, b) => {
        if (b.theoryCorrect !== a.theoryCorrect) {
          return b.theoryCorrect - a.theoryCorrect;
        }
        return (
          this.timeToSeconds(a.theoryTime) - this.timeToSeconds(b.theoryTime)
        );
      });

    let currentTheoryPlace = 1;
    let prevTheoryCorrect = -1;
    let prevTheoryTime = -1;

    const theoryResultsWithPlaces = theoryResults.map((result, index) => {
      if (
        index > 0 &&
        (result.theoryCorrect !== prevTheoryCorrect ||
          this.timeToSeconds(result.theoryTime) !== prevTheoryTime)
      ) {
        currentTheoryPlace = index + 1;
      }

      prevTheoryCorrect = result.theoryCorrect;
      prevTheoryTime = this.timeToSeconds(result.theoryTime);

      const points =
        theoryResults.length -
        currentTheoryPlace +
        this.getBonusPoints(currentTheoryPlace);

      return {
        ...result,
        theoryPlace: currentTheoryPlace,
        theoryPoints: points,
      };
    });

    const practiceResults = participants
      .filter((p) => p.TruckDriverTask.length > 0)
      .map((p) => {
        const task = p.TruckDriverTask[0];
        return {
          userId: p.id,
          practicePenalty: task.practicePenalty || 0,
          practiceTime: task.practiceTime || '00:00',
          practiceSum: task.practiceSum || 0,
          user: p,
        };
      })
      .sort((a, b) => {
        if (b.practiceSum != a.practiceSum) {
          return a.practiceSum - b.practiceSum;
        }
        return (
          this.timeToSeconds(a.practiceTime) -
          this.timeToSeconds(b.practiceTime)
        );
      });
    let currentPracticePlace = 1;
    let prevPracticeSum = -1;

    const practiceResultsWithPlaces = practiceResults.map((result, index) => {
      // if (index > 0 && result.practiceSum !== prevPracticeSum) {
      currentPracticePlace = index + 1;
      // }

      prevPracticeSum = result.practiceSum;

      const points =
        practiceResults.length -
        currentPracticePlace +
        this.getBonusPoints(currentPracticePlace);

      return {
        ...result,
        practicePlace: currentPracticePlace,
        practicePoints: points,
      };
    });

    const combinedResults = participants
      .map((p) => {
        const theory = theoryResultsWithPlaces.find((t) => t.userId === p.id);
        const practice = practiceResultsWithPlaces.find(
          (pr) => pr.userId === p.id,
        );

        const totalPoints =
          (theory?.theoryPoints || 0) + (practice?.practicePoints || 0);
        console.log(this.formatTimeToMMSS(practice?.practiceTime));
        return {
          userId: p.id,
          branchId: p.fullName.branchId,
          branchName: p.fullName.branch?.address || '',
          participantName: p.fullName.fullName || `Участник ${p.id}`,
          number: p.number,
          theoryCorrect: theory?.theoryCorrect || 0,
          theoryTime: this.formatTimeToMMSS(theory?.theoryTime) || '00:00',
          theoryPlace: theory?.theoryPlace || null,
          theoryPoints: theory?.theoryPoints || 0,
          practicePenalty: practice?.practicePenalty || 0,
          practiceTime:
            this.formatTimeToMMSS(practice?.practiceTime) || '00:00',
          practiceSum: practice?.practiceSum || 0,
          practicePlace: practice?.practicePlace || null,
          practicePoints: practice?.practicePoints || 0,
          totalTheoryPoints: theory?.theoryPoints || 0,
          totalPracticePoints: practice?.practicePoints || 0,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((res, index) => ({
        ...res,
        finalPlace: index + 1,
      }));

    await Promise.all(
      combinedResults.map(async (res) => {
        // console.log(res.practiceTime);

        return await this.prisma.truckDriverTask.upsert({
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
      }),
    );

    return combinedResults;
  }

  async getTable() {
    await this.calculateResults();
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший водитель автомобиля (грузового)' },
    });

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (грузового)' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    const tasks = await this.prisma.truckDriverTask.findMany({
      where: { nominationId: nomination.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: {
              select: {
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
        },
      },
      orderBy: { finalPlace: 'asc' },
    });

    let result = await Promise.all(
      tasks.map(async (task) => {
        const lineNumber = await this.prisma.userLineNumber.findUnique({
          where: {
            user_practic_line_unique: {
              userId: task.user.id,
              practicNominationId: practicNomination.id,
            },
          },
        });

        console.log(task.practiceTime);

        return {
          id: task.id,
          practicNominationId: practicNomination.id,
          nominationId: task.nominationId,
          lineNumber: lineNumber?.lineNumber || null,
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
          },
          user: {
            id: task.user.id,
            fullName: task.user.fullName.fullName,
          },
          branch: {
            id: task.user.fullName.branch.id,
            address: task.user.fullName.branch.address,
          },
        };
      }),
    );

    result = result
      .sort((a, b) => {
        if (a.result.points != b.result.points) {
          return b.result.points - a.result.points;
        }
        return (
          this.timeToSeconds(a.practice.time) -
          this.timeToSeconds(b.practice.time)
        );
      })
      .map((item, index) => ({ ...item, place: index + 1 }));

    return result.sort((a, b) =>
      a.user.fullName.localeCompare(b.user.fullName),
    );
  }
}
