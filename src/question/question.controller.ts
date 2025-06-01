import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateQuestionRequest } from './dto/create-question.dto';
import { UpdateQuestionRequest } from './dto/update-question.dto';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @ApiOperation({
    summary: 'Получение вопросов по id номинации',
  })
  @ApiParam({
    name: 'nomination-id',
    description: 'id номинации',
    type: Number,
  })
  @Get('all-by-nomination/:nomination-id')
  async findAllByNomination(
    @Param('nomination-id') nominationId: string,
  ): Promise<Question[]> {
    return await this.questionService.findAllByNomination(+nominationId);
  }

  @ApiOperation({
    summary: 'Получение вопроса по его id',
  })
  @ApiParam({ name: 'id', description: 'id вопроса', type: Number })
  @Get('by-id/:id')
  async findById(@Param('id') id: string): Promise<Question> {
    return await this.questionService.findById(+id);
  }

  @ApiOperation({
    summary: 'Создание вопроса',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        nominationId: { type: 'number' },
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('create')
  @UseInterceptors(FileInterceptor('photo'))
  async create(
    @Body() dto: CreateQuestionRequest,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return await this.questionService.create(dto, photo?.filename);
  }

  @ApiOperation({
    summary: 'Обновление вопроса',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string', required: ['false'] },
        nominationId: { type: 'number', required: ['false'] },
        photo: {
          type: 'string',
          format: 'binary',
          required: ['false'],
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'id вопроса', type: Number })
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('photo'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionRequest,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return await this.questionService.update(+id, dto, photo?.filename);
  }

  @ApiParam({ name: 'id', description: 'id вопроса', type: Number })
  @ApiOperation({
    summary: 'Удаление вопроса',
  })
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return await this.questionService.delete(+id);
  }

  @ApiOperation({
    summary: 'Получение фото',
  })
  @ApiParam({ name: 'filename', description: 'Имя файла', type: String })
  @ApiProduces('image/*')
  @Get('photo/:filename')
  async getPhoto(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = createReadStream(
      join(process.cwd(), 'uploads', 'questions', filename),
    );
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }
}
