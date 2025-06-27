import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StatisticService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserResults(branchId?: number, nominationId?: number) {
    const filterResults = [[], []];

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
    const minScore = await this.prisma.testResult.aggregate({
      where: whereClause,
      _min: {
        score: true,
      },
    });

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
        finishedAt: true,
        score: true,
        total: true,
        user: {
          select: {
            number: true,
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

    // Приводим к нужному виду и добавляет в массив результатов
    results.forEach((item) => {
      filterResults[0].push({
        number: item.user.number,
        nomination: item.nomination.name,
        branch: item.user.branch.address,
        date: item.finishedAt,
        result: `${item.score}/${item.total}`,
      });
    });

    filterResults[1].push({
      passedTest: passesNum.length,
      gpa,
      minScore: minScore._min.score,
      maxScore: maxScore._max.score,
    });

    return filterResults;
  }
}
