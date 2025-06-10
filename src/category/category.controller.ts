import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from '@prisma/client';
import { CreateCategoryRequest } from './dto/create-category.dto';
import { UpdateCategoryRequest } from './dto/update-category.dto';
import { ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({
    summary: 'Все категории по id номинации',
  })
  @Get('all-by-nomination/:nominationId')
  async getAllByNomination(
    @Param('nominationId') id: string,
  ): Promise<Category[]> {
    return await this.categoryService.getAllByNomination(+id);
  }

  @ApiOperation({
    summary: 'Получение категории по id',
  })
  @Get('by-id/:id')
  async getById(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.getById(+id);
  }

  @ApiOperation({
    summary: 'Создание категории',
  })
  @UseGuards(AdminGuard)
  @Post('create')
  async createCategory(@Body() dto: CreateCategoryRequest): Promise<Category> {
    return await this.categoryService.create(dto);
  }

  @ApiOperation({
    summary: 'Обновление категории по id',
  })
  @UseGuards(AdminGuard)
  @Put('update/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryRequest,
  ): Promise<Category> {
    return await this.categoryService.update(+id, dto);
  }

  @ApiOperation({
    summary: 'Удаление категории по id',
  })
  @UseGuards(AdminGuard)
  @Delete('delete/:id')
  async delete(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.delete(+id);
  }
}
