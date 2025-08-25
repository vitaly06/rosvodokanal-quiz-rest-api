// user-line-number.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserLineNumberDto } from './dto/update-user-line-number.dto';

@Injectable()
export class UserLineNumberService {
  constructor(private prisma: PrismaService) {}

  async upsertLineNumber(dto: UpdateUserLineNumberDto) {
    // Проверяем, существует ли пользователь и номинация
    const [user, nomination] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.practicNomination.findUnique({
        where: { id: dto.practicNominationId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${dto.userId} не найден`);
    }
    if (!nomination) {
      throw new NotFoundException(
        `Номинация с ID ${dto.practicNominationId} не найдена`,
      );
    }

    // Проверяем, не занят ли номер линии в этой номинации
    if (dto.lineNumber !== null) {
      const existingLine = await this.prisma.userLineNumber.findFirst({
        where: {
          practicNominationId: dto.practicNominationId,
          lineNumber: dto.lineNumber,
          NOT: { userId: dto.userId }, // Исключаем текущего пользователя
        },
      });

      if (existingLine) {
        throw new ConflictException(
          `Номер линии ${dto.lineNumber} уже занят в номинации ${nomination.name}`,
        );
      }
    }

    try {
      return await this.prisma.userLineNumber.upsert({
        where: {
          user_practic_line_unique: {
            userId: dto.userId,
            practicNominationId: dto.practicNominationId,
          },
        },
        update: { lineNumber: dto.lineNumber },
        create: {
          userId: dto.userId,
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

  async getLineNumber(userId: number, practicNominationId: number) {
    return this.prisma.userLineNumber.findUnique({
      where: {
        user_practic_line_unique: {
          userId,
          practicNominationId,
        },
      },
      include: {
        user: {
          include: {
            fullName: true,
          },
        },
        practicNomination: true,
      },
    });
  }

  async getNextAvailableLineNumber(
    practicNominationId: number,
  ): Promise<number> {
    const existingNumbers = await this.prisma.userLineNumber.findMany({
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
    return this.prisma.userLineNumber.findMany({
      where: { practicNominationId },
      include: {
        user: {
          include: {
            fullName: true,
          },
        },
        practicNomination: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }
}
