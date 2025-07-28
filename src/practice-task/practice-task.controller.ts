import { Body, Controller, Get, Post } from '@nestjs/common';
import { PracticeTaskService } from './practice-task.service';
import { addPracticeScoreRequest } from './dto/add-practice-score.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('practice-task')
export class PracticeTaskController {
  constructor(private readonly practiceTaskService: PracticeTaskService) {}

  @ApiTags('Таблица с практическими заданиями')
  @Post('add-practice-score')
  async addPracticeScore(@Body() dto: addPracticeScoreRequest) {
    return await this.practiceTaskService.addPracticeScore(dto);
  }

  @ApiTags('Таблица с практическими заданиями')
  @Get('all-branches')
  async allBranches() {
    return await this.practiceTaskService.allBranches();
  }
}
