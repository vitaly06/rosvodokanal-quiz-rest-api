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
import { NominationService } from './nomination.service';
import { CreateNominationRequest } from './dto/create-nomination.dto';
import { Nomination } from '@prisma/client';
import { UpdateNominationRequest } from './dto/update-nomination.dto';
import { ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('nomination')
export class NominationController {
  constructor(private readonly nominationService: NominationService) {}

  @ApiOperation({
    summary: 'Получение всех номинаций',
  })
  @Get('all')
  async findAll(): Promise<Nomination[]> {
    return await this.nominationService.findAll();
  }

  @ApiOperation({
    summary: 'Получение номинации по id',
  })
  @Get('by-id/:id')
  async findById(@Param('id') id: string): Promise<Nomination> {
    return await this.nominationService.findById(+id);
  }

  @ApiOperation({
    summary: 'Создание номинации',
  })
  @UseGuards(AdminGuard)
  @Post('create')
  async create(@Body() dto: CreateNominationRequest): Promise<Nomination> {
    return await this.nominationService.create(dto);
  }

  @ApiOperation({
    summary: 'Обновление номинации по id',
  })
  @UseGuards(AdminGuard)
  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateNominationRequest) {
    return await this.nominationService.update(+id, dto);
  }

  @ApiOperation({
    summary: 'Удаление номинации по id',
  })
  @UseGuards(AdminGuard)
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return await this.nominationService.delete(+id);
  }
}
