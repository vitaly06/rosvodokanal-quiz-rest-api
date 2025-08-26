// car-driver.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCarDriverTaskDto } from './dto/car-driver.dto';

@Injectable()
export class CarDriverService {
  constructor(private prisma: PrismaService) {}

  async getResultTable() {
    let result = [];
    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший водитель автомобиля (легкового)' },
    });

    const nomination = await this.prisma.nomination.findUnique({
      where: { name: 'Водитель автомобиля (легкового)' },
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
    let theoryPoints;

    for (const user of users) {
      const results = await this.prisma.carDriverTask.findFirst({
        where: {
          userId: user.id,
          nominationId: nomination.id,
        },
      });
      console.log(1);
      theoryPoints = await this.prisma.testResult.findMany({
        where: { nominationId: nomination.id, userId: user.id },
        select: {
          score: true,
        },
      });

      console.log(theoryPoints);

      result.push({
        branchName: user.fullName.branch.address,
        fullName: user.fullName.fullName,
        theoryScore:
          theoryPoints.reduce((sum, elem) => (sum += elem.score), 0) || 0,
        practiceScore: results?.practicePoints || 0,
        totalScore:
          (theoryPoints.reduce((sum, elem) => (sum += elem.score), 0) || 0) +
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
    // Извлекаем минуты и секунды из строки
    if (!timeString) {
      return '00:00';
    }
    const minutesMatch = timeString.match(/(\d+)\s*мин/);
    const secondsMatch = timeString.match(/(\d+)\s*сек/);

    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

    // Форматируем в MM:SS с ведущими нулями
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
    console.log(`${timeStr} - ${minutes * 60 + seconds}`);
    return minutes * 60 + seconds;
  }
  private secondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async updateTask(dto: UpdateCarDriverTaskDto) {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (легкового)' },
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

    // Конвертируем время в секунды и вычисляем сумму
    const practiceTimeSeconds = this.timeToSeconds(dto.practiceTime || '00:00');
    const practicePenalty = dto.practicePenalty || 0;
    const practiceSum = practiceTimeSeconds + practicePenalty;

    const updateData = {
      practicePenalty: practicePenalty,
      practiceTime: dto.practiceTime || '00:00',
      practiceSum: practiceSum, // Добавляем расчет суммы
    };

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

    await this.prisma.carDriverTask.upsert({
      where: {
        car_driver_unique: {
          userId: dto.userId,
          nominationId: nomination.id,
        },
      },
      update: updateData,
      create: createData,
    });
  }

  private getBonusPoints(place: number): number {
    return place === 1 ? 3 : place === 2 ? 1 : 0;
  }

  async calculateResults() {
    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (легкового)' },
    });

    const practicNomination = await this.prisma.practicNomination.findUnique({
      where: { name: 'Лучший водитель автомобиля (легкового)' },
    });

    if (!nomination || !practicNomination) {
      throw new Error('Номинация не найдена');
    }

    // Получаем всех участников
    const participants = await this.prisma.user.findMany({
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
        TestResult: {
          where: {
            nominationId: nomination.id,
          },
          orderBy: {
            finishedAt: 'desc',
          },
        },
        CarDriverTask: {
          where: {
            nominationId: nomination.id,
          },
        },
      },
    });

    // 1. Расчет теоретической части (ПДД)
    // Включаем всех участников, даже без TestResult
    const theoryResults = participants
      .map((p) => ({
        userId: p.id,
        theoryCorrect: p.TestResult.length > 0 ? p.TestResult[0].score : 0,
        theoryTime:
          p.TestResult.length > 0 ? p.TestResult[0].duration : '99:99',
        user: p,
      }))
      .sort((a, b) => {
        // Сортировка по количеству правильных ответов (убывание)
        if (b.theoryCorrect !== a.theoryCorrect) {
          return b.theoryCorrect - a.theoryCorrect;
        }
        // Если одинаковое количество баллов, то по времени (возрастание)
        return (
          this.timeToSeconds(a.theoryTime) - this.timeToSeconds(b.theoryTime)
        );
      });

    // Присваиваем места для теории
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

      // Баллы = (количество участников - место) + бонусные баллы
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

    // 2. Расчет практической части (маневрирование)
    // Включаем всех участников, даже без CarDriverTask
    const practiceResults = participants
      .map((p) => {
        const task = p.CarDriverTask.length > 0 ? p.CarDriverTask[0] : null;
        return {
          userId: p.id,
          practicePenalty: task?.practicePenalty || 0,
          practiceTime: task?.practiceTime || '99:99',
          practiceSum: task?.practiceSum || 9999, // Большое число для тех, у кого нет результатов
          user: p,
        };
      })
      .sort((a, b) => a.practiceSum - b.practiceSum); // Меньшая сумма = лучше

    // Присваиваем места для практики
    let currentPracticePlace = 1;
    let prevPracticeSum = -1;

    const practiceResultsWithPlaces = practiceResults.map((result, index) => {
      if (index > 0 && result.practiceSum !== prevPracticeSum) {
        currentPracticePlace = index + 1;
      }

      prevPracticeSum = result.practiceSum;

      // Баллы = (количество участников - место) + бонусные баллы
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

    // 3. Объединение результатов
    const combinedResults = participants
      .map((p) => {
        const theory = theoryResultsWithPlaces.find((t) => t.userId === p.id);
        const practice = practiceResultsWithPlaces.find(
          (pr) => pr.userId === p.id,
        );

        const totalPoints =
          (theory?.theoryPoints || 0) + (practice?.practicePoints || 0);

        return {
          userId: p.id,
          branchId: p.fullName.branchId,
          branchName: p.fullName.branch?.address || '',
          participantName: p.fullName.fullName || `Участник ${p.id}`,
          number: p.number,
          // Теория
          theoryCorrect: theory?.theoryCorrect || 0,
          theoryTime:
            theory?.theoryTime === '99:99'
              ? '00:00'
              : this.formatTimeToMMSS(theory?.theoryTime) || '00:00',
          theoryPlace: theory?.theoryPlace || practiceResults.length, // Последнее место если нет результатов
          theoryPoints: theory?.theoryPoints || 0,
          // Практика
          practicePenalty: practice?.practicePenalty || 0,
          practiceTime:
            practice?.practiceTime === '99:99'
              ? '00:00'
              : this.formatTimeToMMSS(practice?.practiceTime) || '00:00',
          practiceSum:
            practice?.practiceSum === 9999 ? 0 : practice?.practiceSum || 0,
          practicePlace: practice?.practicePlace || practiceResults.length, // Последнее место если нет результатов
          practicePoints: practice?.practicePoints || 0,
          // Итоги
          totalTheoryPoints: theory?.theoryPoints || 0,
          totalPracticePoints: practice?.practicePoints || 0,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints) // Сортировка по общим баллам (убывание)
      .map((res, index) => ({
        ...res,
        finalPlace: index + 1,
      }));

    await Promise.all(
      combinedResults.map(async (res) => {
        return await this.prisma.carDriverTask.upsert({
          where: {
            car_driver_unique: {
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
      where: { name: 'Лучший водитель автомобиля (легкового)' },
    });

    const nomination = await this.prisma.nomination.findFirst({
      where: { name: 'Водитель автомобиля (легкового)' },
    });

    if (!nomination) {
      throw new Error('Номинация не найдена');
    }

    let result = [];

    const tasks = await this.prisma.carDriverTask.findMany({
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

    for (const task of tasks) {
      const lineNumber = await this.prisma.userLineNumber.findUnique({
        where: {
          user_practic_line_unique: {
            userId: task.user.id,
            practicNominationId: practicNomination.id,
          },
        },
      });

      console.log(tasks.length);

      result.push({
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
      });
    }

    result = result
      .sort((a, b) => b.result.points - a.result.points)
      .map((item, index) => ({ ...item, place: index + 1 }));

    return result.sort((a, b) =>
      a.user.fullName.localeCompare(b.user.fullName),
    );
  }
}
