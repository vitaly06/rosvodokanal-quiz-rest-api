import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateLineNumberDto } from './dto/update-line-number.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchLineNumberService {
  constructor(private prisma: PrismaService) {}

  async upsertLineNumber(dto: UpdateLineNumberDto) {
    // Проверяем, существует ли филиал и номинация
    const [branch, nomination] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.practicNomination.findUnique({
        where: { id: dto.practicNominationId },
      }),
    ]);

    if (!branch) {
      throw new NotFoundException(`Филиал с ID ${dto.branchId} не найден`);
    }
    if (!nomination) {
      throw new NotFoundException(
        `Номинация с ID ${dto.practicNominationId} не найдена`,
      );
    }

    // Проверяем, не занят ли номер линии в этой номинации
    if (dto.lineNumber !== null) {
      const existingLine = await this.prisma.branchLineNumber.findFirst({
        where: {
          practicNominationId: dto.practicNominationId,
          lineNumber: dto.lineNumber,
          NOT: { branchId: dto.branchId }, // Исключаем текущий филиал
        },
      });

      if (existingLine) {
        throw new ConflictException(
          `Номер линии ${dto.lineNumber} уже занят в номинации ${nomination.name}`,
        );
      }
    }

    try {
      return await this.prisma.branchLineNumber.upsert({
        where: {
          branch_practic_line_unique: {
            branchId: dto.branchId,
            practicNominationId: dto.practicNominationId,
          },
        },
        update: { lineNumber: dto.lineNumber },
        create: {
          branchId: dto.branchId,
          practicNominationId: dto.practicNominationId,
          lineNumber: dto.lineNumber,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Номер линии уже занят в этой номинации');
      }
      throw error;
    }
  }

  async getLineNumber(branchId: number, practicNominationId: number) {
    return this.prisma.branchLineNumber.findUnique({
      where: {
        branch_practic_line_unique: {
          branchId: +branchId,
          practicNominationId: +practicNominationId,
        },
      },
      include: {
        branch: true,
        practicNomination: true,
      },
    });
  }

  async getNextAvailableLineNumber(
    practicNominationId: number,
  ): Promise<number> {
    const existingNumbers = await this.prisma.branchLineNumber.findMany({
      where: {
        practicNominationId,
        lineNumber: { not: null },
      },
      select: { lineNumber: true },
      orderBy: { lineNumber: 'asc' },
    });

    const usedNumbers = existingNumbers
      .map((item) => item.lineNumber)
      .filter(Boolean);

    if (usedNumbers.length === 0) return 1;

    // Находим первое свободное число
    for (let i = 1; i <= usedNumbers.length + 1; i++) {
      if (!usedNumbers.includes(i)) {
        return i;
      }
    }

    return usedNumbers.length + 1;
  }

  async getLineNumbersByNomination(practicNominationId: number) {
    return this.prisma.branchLineNumber.findMany({
      where: { practicNominationId },
      include: {
        branch: true,
        practicNomination: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }
}
