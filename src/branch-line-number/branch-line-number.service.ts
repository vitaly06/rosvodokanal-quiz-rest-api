import { Injectable } from '@nestjs/common';
import { UpdateLineNumberDto } from './dto/update-line-number.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchLineNumberService {
  constructor(private prisma: PrismaService) {}

  async upsertLineNumber(dto: UpdateLineNumberDto) {
    return this.prisma.branchLineNumber.upsert({
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
  }

  async getLineNumber(branchId: number, practicNominationId: number) {
    return this.prisma.branchLineNumber.findUnique({
      where: {
        branch_practic_line_unique: {
          branchId: +branchId,
          practicNominationId: +practicNominationId,
        },
      },
    });
  }
}
