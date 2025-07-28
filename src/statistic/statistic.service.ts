import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StatisticService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserResults(branchId?: number, nominationId?: number) {
    const filterResults = {};
    filterResults['testResults'] = [];

    // Базовые условия для фильтрации
    const whereClause = {
      ...(nominationId && { nominationId }),
      ...(branchId && {
        user: {
          branchId,
        },
      }),
    };

    // Общее число прохождений теста с фильтрацией
    const passesNum = await this.prisma.testResult.findMany({
      where: whereClause,
      select: {
        nominationId: true,
        user: {
          select: {
            branch: {
              select: {
                id: true,
              },
            },
          },
        },
        score: true,
      },
    });

    // Средний балл тестов (только отфильтрованные)
    const gpa =
      passesNum.length > 0
        ? passesNum.reduce((sum, elem) => sum + elem.score, 0) /
          passesNum.length
        : 0;

    // Минимальное число баллов (с фильтрацией)
    // const minScore = await this.prisma.testResult.aggregate({
    //   where: whereClause,
    //   _min: {
    //     score: true,
    //   },
    // });

    // Максимальное число баллов (с фильтрацией)
    const maxScore = await this.prisma.testResult.aggregate({
      where: whereClause,
      _max: {
        score: true,
      },
    });

    // Таблица результатов пользователей
    const results = await this.prisma.testResult.findMany({
      where: whereClause,
      select: {
        duration: true,
        score: true,
        total: true,
        percentage: true,
        user: {
          select: {
            id: true,
            number: true,
            fullName: true,
            branch: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
        nomination: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Приводим к нужному виду и добавляем в массив результатов
    results.forEach((item) => {
      filterResults['testResults'].push({
        userId: item.user.id,
        number: item.user.number,
        fullName: item.user.fullName,
        nominationId: item.nomination.id,
        nomination: item.nomination.name,
        branch: item.user.branch.address || 'Филиал не указан',
        date: item.duration,
        result: `${item.score}/${item.total}`,
        percentage: item.percentage,
      });
    });
    // Сортируем по проценту результата и времени прохождения
    filterResults['testResults'].sort((a: any, b: any) => {
      if (a.percentage !== b.percentage) {
        return b.percentage - a.percentage;
      }

      const parseDuration = (duration: string) => {
        const minutesMatch = duration.match(/(\d+) мин/);
        const secondsMatch = duration.match(/(\d+) сек/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0;
        return minutes * 60 + seconds;
      };

      const aSeconds = parseDuration(a.date);
      const bSeconds = parseDuration(b.date);
      return aSeconds - bSeconds;
    });

    filterResults['blockStats'] = {
      passedTest: passesNum.length,
      gpa: gpa.toFixed(1),
      maxScore: maxScore._max.score,
    };

    return filterResults;
  }

  async getBranchResults(nominationId?: number | null) {
    const result = [];

    if (!nominationId) {
      nominationId = (
        await this.prisma.nomination.findUnique({
          where: { name: 'Сварщик' },
        })
      )?.id;
    }

    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
      select: {
        id: true,
        name: true,
        TestResult: {
          select: {
            id: true,
            user: {
              select: {
                branch: {
                  select: {
                    address: true,
                  },
                },
              },
            },
            score: true,
          },
        },
      },
    });

    // Сумма баллов каждого филиала
    const points = {};

    const branchs = await this.prisma.branch.findMany();
    for (const branch of branchs) {
      points[branch.address] = 0;
    }
    for (const result of nomination.TestResult) {
      if (result.user.branch.address) {
        points[result.user.branch.address] += result.score;
      }
    }
    for (const branch of branchs) {
      result.push({
        nomination: nomination.name,
        branch: branch.address,
        totalScore: points[branch.address],
      });
    }

    result.sort((a: any, b: any) => b.totalScore - a.totalScore);

    return result;
  }
}
