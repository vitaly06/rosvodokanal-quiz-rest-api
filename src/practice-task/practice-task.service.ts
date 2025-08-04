// practice-task.service.ts
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
        where: { branchId: branch.id, nominationId },
        orderBy: { taskNumber: 'asc' },
      });

      const taskData = Array(3).fill({ score: 0, time: '00:00', penalty: 0 });
      let totalScore = 0;
      let totalTime = 0; // в секундах для сортировки

      tasks.forEach((task) => {
        if (task.taskNumber >= 1 && task.taskNumber <= 3) {
          taskData[task.taskNumber - 1] = {
            score: task.score,
            time: task.time || '00:00',
            penalty: task.penalty || 0,
          };

          totalScore += task.score - (task.penalty || 0);

          // Конвертируем время в секунды
          if (task.time) {
            const [minutes, seconds] = task.time.split(':').map(Number);
            totalTime += minutes * 60 + seconds;
          }
        }
      });

      result.push({
        branchId: branch.id,
        branchName: branch.address,
        tasks: taskData,
        totalScore,
        totalTime, // для сортировки
      });
    }

    // Сортировка по totalScore (убывание), затем по totalTime (возрастание)
    result.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.totalTime - b.totalTime;
    });

    // Формируем финальный результат с местами
    return result.map((item, index) => ({
      place: index + 1,
      branchName: item.branchName,
      task1: item.tasks[0],
      task2: item.tasks[1],
      task3: item.tasks[2],
      total: item.totalScore,
    }));
  }

  private async getGeneralTable() {
    const nominations = await this.prisma.nomination.findMany();
    const branches = await this.prisma.branch.findMany();
    const result = [];

    for (const branch of branches) {
      const branchData: any = {
        branchId: branch.id,
        branchName: branch.address,
        totalScore: 0,
      };

      for (const nomination of nominations) {
        const tasks = await this.prisma.practiceTask.findMany({
          where: { branchId: branch.id, nominationId: nomination.id },
        });

        const nominationScore = tasks.reduce((sum, task) => {
          return sum + (task.score - (task.penalty || 0));
        }, 0);

        branchData[nomination.name] = nominationScore;
        branchData.totalScore += nominationScore;
      }

      result.push(branchData);
    }

    // Сортировка по totalScore (убывание)
    result.sort((a, b) => b.totalScore - a.totalScore);

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
