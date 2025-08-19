import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FullNameService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.fullName.findMany({
      select: {
        id: true,
        fullName: true,
      },
    });
  }
}
