import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { addPracticeScoreRequest } from './dto/add-practice-score.dto';

@Injectable()
export class PracticeTaskService {
  constructor(private readonly prisma: PrismaService) {}

  async addPracticeScore(dto: addPracticeScoreRequest) {
    const { taskNumber, score, branchId } = { ...dto };
    const checkScore = await this.prisma.practiceTask.findFirst({
      where: {
        taskNumber,
        branchId,
      },
    });

    if (!checkScore) {
      await this.prisma.practiceTask.create({
        data: {
          taskNumber,
          score,
          branchId,
        },
      });
    } else {
      await this.prisma.practiceTask.updateMany({
        where: {
          taskNumber,
          branchId,
        },
        data: {
          score,
        },
      });
    }

    return { message: 'Баллы успешно обновлены' };
  }

  async allBranches() {
    const result = [];
    const branches = await this.prisma.branch.findMany();

    for (const branch of branches) {
      const tasks = await this.prisma.practiceTask.findMany({
        where: {
          branchId: branch.id,
        },
      });

      // Создаем массив из 5 элементов, заполненный нулями
      const taskScores = Array(5).fill(0);

      tasks.forEach((task) => {
        if (task.taskNumber >= 1 && task.taskNumber <= 5) {
          taskScores[task.taskNumber - 1] = task.score;
        }
      });

      result.push({
        branchId: branch.id,
        branchName: branch.address,
        tasks: taskScores,
        totalScore: taskScores.reduce((sum, score) => sum + score, 0),
      });
    }

    // Сортируем по убыванию общей суммы баллов
    result.sort((a, b) => b.totalScore - a.totalScore);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return result.map(({ totalScore, ...rest }) => rest);
  }
}
