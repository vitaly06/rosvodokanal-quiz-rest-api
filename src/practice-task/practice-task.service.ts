import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePracticeTaskDto } from './dto/add-practice-score.dto';

@Injectable()
export class PracticeTaskService {
  constructor(private readonly prisma: PrismaService) {}

  async getPracticeTable(nominationId?: number) {
    if (nominationId) {
      return this.getNominationTable(nominationId);
    }
    return this.getGeneralTable();
  }

  private async getNominationTable(nominationId: number) {
    const branches = await this.prisma.branch.findMany();
    const result = [];

    for (const branch of branches) {
      const tasks = await this.prisma.practiceTask.findMany({
        where: {
          branchId: branch.id,
          nominationId: nominationId,
        },
        orderBy: { taskNumber: 'asc' },
      });

      // Создаем массив для 3 задач с дефолтными значениями
      const taskResults = Array(3)
        .fill(null)
        .map((_, index) => {
          const task = tasks.find((t) => t.taskNumber === index + 1);
          return {
            score: task?.score || 0,
            time: task?.time || '00:00',
            penalty: task?.penalty || 0,
          };
        });

      // Считаем общий балл (сумма score - сумма penalty)
      const totalScore = taskResults.reduce((sum, task) => {
        return sum + (task.score - task.penalty);
      }, 0);

      result.push({
        branchId: branch.id,
        branchName: branch.address,
        tasks: taskResults, // Массив задач
        total: totalScore,
      });
    }

    // Сортировка по total (убывание), затем по времени (если нужно)
    result.sort((a, b) => b.total - a.total);

    // Добавляем места
    return result.map((item, index) => ({
      place: index + 1,
      ...item,
    }));
  }

  private async getGeneralTable() {
    const nominations = await this.prisma.nomination.findMany();
    const branches = await this.prisma.branch.findMany();
    const result = [];

    for (const branch of branches) {
      const tasks = await this.prisma.practiceTask.findMany({
        where: { branchId: branch.id },
        include: { nomination: true },
      });

      // Группируем задачи по номинациям
      const tasksByNomination = tasks.reduce((acc, task) => {
        if (!acc[task.nomination.name]) {
          acc[task.nomination.name] = [];
        }
        acc[task.nomination.name].push(task);
        return acc;
      }, {});

      // Формируем массив номинаций с баллами
      const nominationResults = nominations.map((nomination) => {
        const tasks = tasksByNomination[nomination.name] || [];
        const total = tasks.reduce((sum, task) => {
          return sum + (task.score - (task.penalty || 0));
        }, 0);

        return {
          name: nomination.name,
          points: total,
        };
      });

      // Общий балл по всем номинациям
      const totalScore = nominationResults.reduce(
        (sum, item) => sum + item.points,
        0,
      );

      result.push({
        branchId: branch.id,
        branchName: branch.address,
        tasks: nominationResults, // Массив номинаций с баллами
        total: totalScore,
      });
    }

    // Сортировка по total (убывание)
    result.sort((a, b) => b.total - a.total);

    // Добавляем места
    return result.map((item, index) => ({
      place: index + 1,
      ...item,
    }));
  }

  async updatePracticeTask(dto: UpdatePracticeTaskDto) {
    return this.prisma.practiceTask.update({
      where: { id: dto.id },
      data: {
        score: dto.score,
        time: dto.time,
        penalty: dto.penalty,
      },
    });
  }
}
