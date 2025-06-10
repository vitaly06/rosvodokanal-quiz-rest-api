import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryRequest } from './dto/create-category.dto';
import { UpdateCategoryRequest } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllByNomination(nominationId: number): Promise<Category[]> {
    return await this.prisma.category.findMany({
      where: { nominationId },
    });
  }

  async getById(id: number): Promise<Category> {
    return await this.prisma.category.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateCategoryRequest): Promise<Category> {
    const { name, nominationId } = { ...dto };

    return await this.prisma.category.create({
      data: { name, nominationId },
    });
  }

  async update(
    categoryId: number,
    dto: UpdateCategoryRequest,
  ): Promise<Category> {
    const { name, nominationId } = { ...dto };

    const category = await this.getById(categoryId);
    const updatedData: any = {};

    if (name) {
      updatedData.name = name;
    }
    if (nominationId) {
      const nomination = await this.prisma.nomination.findUnique({
        where: { id: nominationId },
      });
      if (!nomination) {
        throw new NotFoundException('Номинации с таким id не существует');
      }
      updatedData.nominationId = nominationId;
    }

    if (!category) {
      throw new NotFoundException('Категории с таким id не существует');
    }

    return await this.prisma.category.update({
      where: { id: categoryId },
      data: updatedData,
    });
  }

  async delete(id: number): Promise<Category> {
    return await this.prisma.category.delete({
      where: { id },
    });
  }
}
