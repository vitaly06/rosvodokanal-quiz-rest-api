import { Module } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { StatisticController } from './statistic.controller';
// import { PracticeTaskModule } from 'src/practice-task/practice-task.module';

@Module({
  // imports: [PracticeTaskModule],
  controllers: [StatisticController],
  providers: [StatisticService],
})
export class StatisticModule {}
