import { Injectable, NotFoundException } from '@nestjs/common';
import { Answer } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAnswerRequest } from './dto/create-answer.dto';
import { UpdateAnswerRequest } from './dto/update-answer.dto';

@Injectable()
export class AnswerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByQuestion(questionId: number): Promise<Answer[]> {
    const existQuestion = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!existQuestion) {
      throw new NotFoundException('Вопрос с таким id не найден');
    }
    return await this.prisma.answer.findMany({
      where: { questionId },
    });
  }

  async findById(id: number): Promise<Answer> {
    return await this.prisma.answer.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateAnswerRequest): Promise<Answer> {
    const { answer, correctness, questionId } = { ...dto };
    return await this.prisma.answer.create({
      data: {
        answer,
        correctness,
        questionId,
      },
    });
  }

  async update(id: number, dto: UpdateAnswerRequest): Promise<Answer> {
    return await this.prisma.answer.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async delete(id: number): Promise<Answer> {
    return await this.prisma.answer.delete({
      where: { id },
    });
  }
}
