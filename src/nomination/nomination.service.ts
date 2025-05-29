import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNominationRequest } from './dto/create-nomination.dto';
import { Nomination } from '@prisma/client';
import { UpdateNominationRequest } from './dto/update-nomination.dto';

@Injectable()
export class NominationService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Nomination[]> {
    return await this.prisma.nomination.findMany();
  }

  async findById(id: number): Promise<Nomination> {
    return await this.prisma.nomination.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateNominationRequest): Promise<Nomination> {
    const { name, duration, questionsCount } = { ...dto };

    const existNomination = await this.prisma.nomination.findUnique({
      where: { name },
    });
    if (existNomination) {
      throw new ConflictException('Номинация с таким названием уже существует');
    }
    return await this.prisma.nomination.create({
      data: {
        name,
        duration: await this.formatTime(duration),
        questionsCount,
      },
    });
  }

  async update(id: number, dto: UpdateNominationRequest) {
    const { name, duration, questionsCount } = { ...dto };

    const existNomination = await this.prisma.nomination.findUnique({
      where: { id },
    });
    if (!existNomination) {
      throw new NotFoundException('Номинация не найдена ');
    }
    const checkName = await this.prisma.nomination.findUnique({
      where: { name },
    });
    if ((checkName && checkName.id == id) || !checkName) {
      await this.prisma.nomination.update({
        where: { id },
        data: {
          name,
          duration: await this.formatTime(duration),
          questionsCount,
        },
      });
      return { succes: true };
    } else {
      throw new BadRequestException(
        'Номинация с таким названием уже существует',
      );
    }
  }

  async delete(id: number) {
    const checkNomination = await this.prisma.nomination.findUnique({
      where: { id },
    });
    if (!checkNomination) {
      throw new NotFoundException('Номинация с таким id не найдена');
    }
    await this.prisma.nomination.delete({
      where: { id },
    });
    return { success: true };
  }

  async formatTime(duration: string) {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    return new Date(Date.now() + durationMs);
  }
}
