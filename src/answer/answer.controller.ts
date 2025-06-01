import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AnswerService } from './answer.service';
import { Answer } from '@prisma/client';
import { CreateAnswerRequest } from './dto/create-answer.dto';
import { UpdateAnswerRequest } from './dto/update-answer.dto';
import { ApiOperation, ApiParam } from '@nestjs/swagger';

@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @ApiOperation({
    summary: 'Получение всех ответов по questionId',
  })
  @ApiParam({ name: 'questionId', description: 'id вопроса', type: Number })
  @Get('all-by-question/:questionId')
  async allByQuestion(
    @Param('questionId') questionId: string,
  ): Promise<Answer[]> {
    return await this.answerService.findAllByQuestion(+questionId);
  }

  @ApiOperation({
    summary: 'Получение ответа по id',
  })
  @ApiParam({ name: 'id', description: 'id ответа', type: Number })
  @Get('by-id/:id')
  async findById(@Param('id') id: string): Promise<Answer> {
    return await this.answerService.findById(+id);
  }

  @ApiOperation({
    summary: 'Создание ответа',
  })
  @Post('create')
  async create(@Body() dto: CreateAnswerRequest): Promise<Answer> {
    return await this.answerService.create(dto);
  }

  @ApiOperation({
    summary: 'Обновление ответа по id',
  })
  @ApiParam({ name: 'id', description: 'id ответа', type: Number })
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnswerRequest,
  ): Promise<Answer> {
    return await this.answerService.update(+id, dto);
  }

  @ApiOperation({
    summary: 'Удаление ответа по id',
  })
  @ApiParam({ name: 'id', description: 'id ответа', type: Number })
  @Delete('delete/:id')
  async delete(@Param('id') id: string): Promise<Answer> {
    return await this.answerService.delete(+id);
  }
}
