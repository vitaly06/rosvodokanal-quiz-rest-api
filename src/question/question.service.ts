import { Injectable, NotFoundException } from '@nestjs/common';
import { Question } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuestionRequest } from './dto/create-question.dto';
import { UpdateQuestionRequest } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByNomination(nominationId: number) {
    const existNomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
    });
    if (!existNomination) {
      throw new NotFoundException('Номинации с таким id не существует');
    }
    return await this.prisma.question.findMany({
      where: {
        nominationId,
      },
      select: {
        id: true,
        question: true,
        answers: {
          where: { correctness: true },
        },
      },
    });
  }

  async findById(id: number): Promise<Question> {
    const existQuestion = await this.prisma.question.findUnique({
      where: { id },
    });
    if (!existQuestion) {
      throw new NotFoundException('Вопрос с таким id не найден');
    }
    return existQuestion;
  }

  async create(dto: CreateQuestionRequest, photoName?: string) {
    dto.nominationId = +dto.nominationId;
    return await this.prisma.question.create({
      data: {
        ...dto,
        photoName,
      },
    });
  }

  async update(id: number, dto: UpdateQuestionRequest, photoName?: string) {
    dto.nominationId = +dto.nominationId;
    return this.prisma.question.update({
      where: { id },
      data: {
        ...dto,
        ...(photoName && { photoName }),
      },
    });
  }

  async delete(id: number) {
    return await this.prisma.question.delete({
      where: { id },
    });
  }
}
