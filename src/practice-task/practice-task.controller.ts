import { Body, Controller, Get, Post } from '@nestjs/common';
import { PracticeTaskService } from './practice-task.service';
import { addPracticeScoreRequest } from './dto/add-practice-score.dto';

@Controller('practice-task')
export class PracticeTaskController {
  constructor(private readonly practiceTaskService: PracticeTaskService) {}

  @Post('add-practice-score')
  async addPracticeScore(@Body() dto: addPracticeScoreRequest) {
    return await this.practiceTaskService.addPracticeScore(dto);
  }

  @Get('all-branches')
  async allBranches() {
    return await this.practiceTaskService.allBranches();
  }
}
