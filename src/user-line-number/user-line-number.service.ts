// user-line-number.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserLineNumberDto } from './dto/update-user-line-number.dto';

@Injectable()
export class UserLineNumberService {
  constructor(private prisma: PrismaService) {}

  async upsertLineNumber(dto: UpdateUserLineNumberDto) {
    return this.prisma.userLineNumber.upsert({
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
  }

  async getLineNumber(userId: number, practicNominationId: number) {
    return this.prisma.userLineNumber.findUnique({
      where: {
        user_practic_line_unique: {
          userId,
          practicNominationId,
        },
      },
    });
  }
}
