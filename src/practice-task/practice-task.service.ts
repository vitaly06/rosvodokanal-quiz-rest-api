// import { Injectable } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { UpdatePracticeTaskDto } from './dto/add-practice-score.dto';

// @Injectable()
// export class PracticeTaskService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getPracticeTable(nominationId?: number) {
//     if (nominationId) {
//       return this.getNominationTable(nominationId);
//     }
//     return this.getGeneralTable();
//   }

//   private async getNominationTable(nominationId: number) {
//     const branches = await this.prisma.branch.findMany();
//     const result = [];

//     for (const branch of branches) {
//       const tasks = await this.prisma.practiceTask.findMany({
//         where: {
//           branchId: branch.id,
//           nominationId: nominationId,
//         },
//         orderBy: { taskNumber: 'asc' },
//       });

//       // Создаем массив для 3 задач с дефолтными значениями
//       const taskResults = Array(3)
//         .fill(null)
//         .map((_, index) => {
//           const task = tasks.find((t) => t.taskNumber === index + 1);
//           return {
//             id: task?.id,
//             score: task?.score || 0,
//             time: task?.time || '00:00',
//             penalty: task?.penalty || 0,
//           };
//         });

//       // Считаем общий балл (сумма score - сумма penalty)
//       const totalScore = taskResults.reduce((sum, task) => {
//         return sum + (task.score - task.penalty);
//       }, 0);

//       result.push({
//         branchId: branch.id,
//         branchName: branch.address,
//         tasks: taskResults, // Массив задач
//         total: totalScore,
//       });
//     }

//     // Сортировка по total (убывание), затем по времени (если нужно)
//     result.sort((a, b) => b.total - a.total);

//     // Добавляем места
//     return result.map((item, index) => ({
//       place: index + 1,
//       ...item,
//     }));
//   }

//   private async getGeneralTable() {
//     const nominations = await this.prisma.nomination.findMany();
//     const branches = await this.prisma.branch.findMany();
//     const result = [];

//     for (const branch of branches) {
//       const tasks = await this.prisma.practiceTask.findMany({
//         where: { branchId: branch.id },
//         include: { nomination: true },
//       });

//       // Группируем задачи по номинациям с проверкой на null
//       const tasksByNomination = tasks.reduce((acc, task) => {
//         // Проверяем, что nomination существует и имеет name
//         if (task.nomination?.name) {
//           if (!acc[task.nomination.name]) {
//             acc[task.nomination.name] = [];
//           }
//           acc[task.nomination.name].push(task);
//         }
//         return acc;
//       }, {});

//       // Формируем массив номинаций с баллами
//       const nominationResults = nominations.map((nomination) => {
//         const tasks = tasksByNomination[nomination.name] || [];
//         const total = tasks.reduce((sum, task) => {
//           return sum + (task.score - (task.penalty || 0));
//         }, 0);

//         return {
//           name: nomination.name,
//           points: total,
//         };
//       });

//       // Общий балл по всем номинациям
//       const totalScore = nominationResults.reduce(
//         (sum, item) => sum + item.points,
//         0,
//       );

//       result.push({
//         branchId: branch.id,
//         branchName: branch.address,
//         tasks: nominationResults,
//         total: totalScore,
//       });
//     }

//     // Сортировка по total (убывание)
//     result.sort((a, b) => b.total - a.total);

//     // Добавляем места
//     return result.map((item, index) => ({
//       place: index + 1,
//       ...item,
//     }));
//   }

//   async upsertPracticeTask(dto: UpdatePracticeTaskDto) {
//     return this.prisma.practiceTask.upsert({
//       where: {
//         branch_nomination_task: {
//           branchId: dto.branchId,
//           nominationId: dto.nominationId,
//           taskNsumber: dto.taskNumber,
//         },
//       },
//       update: {
//         score: dto.score,
//         time: dto.time,
//         penalty: dto.penalty,
//       },
//       create: {
//         branchId: dto.branchId,
//         nominationId: dto.nominationId,
//         taskNumber: dto.taskNumber,
//         score: dto.score ?? 0,
//         time: dto.time ?? '00:00',
//         penalty: dto.penalty ?? 0,
//       },
//     });
//   }
// }
