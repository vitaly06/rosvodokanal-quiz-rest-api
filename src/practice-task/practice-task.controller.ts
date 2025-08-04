// practice-task.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PracticeTaskService } from './practice-task.service';
import { ApiTags } from '@nestjs/swagger';
import {
  GetPracticeTableDto,
  UpdatePracticeTaskDto,
} from './dto/add-practice-score.dto';

@ApiTags('Таблица с практическими заданиями')
@Controller('practice-task')
export class PracticeTaskController {
  constructor(private readonly practiceTaskService: PracticeTaskService) {}

  @Get('table')
  async getPracticeTable(@Query() dto: GetPracticeTableDto) {
    return this.practiceTaskService.getPracticeTable(+dto.nominationId);
  }

  @Post('update')
  async updatePracticeTask(@Body() dto: UpdatePracticeTaskDto) {
    return this.practiceTaskService.updatePracticeTask(dto);
  }
}
