import { Module } from '@nestjs/common';
import { PracticeTaskService } from './practice-task.service';
import { PracticeTaskController } from './practice-task.controller';

@Module({
  controllers: [PracticeTaskController],
  providers: [PracticeTaskService],
  exports: [PracticeTaskService],
})
export class PracticeTaskModule {}
