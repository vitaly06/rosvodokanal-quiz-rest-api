import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @ApiOperation({
    summary: 'Получение таблицы статистики пользователей',
  })
  @ApiQuery({ name: 'branchId', type: String, required: false })
  @ApiQuery({ name: 'nominationId', type: String, required: false })
  @UseGuards(AdminGuard)
  @Get('user-statistic')
  async getUserStatistic(
    @Query('branchId') branchId?: string,
    @Query('nominationId') nominationId?: string,
  ) {
    return await this.statisticService.getUserResults(+branchId, +nominationId);
  }

  @ApiQuery({ name: 'nominationId', required: false })
  @UseGuards(AdminGuard)
  @Get('branch-statistic')
  async getBranchStatistic(@Query('nominationId') nominationId?: string) {
    return await this.statisticService.getBranchResults(+nominationId || null);
  }

  // @ApiOperation({
  //   summary: 'Получение таблицы статистики тестов',
  // })
  // @ApiQuery({ name: 'branchId', type: String, required: false })
  // @ApiQuery({ name: 'nominationId', type: String, required: false })
  // @UseGuards(AdminGuard)
  // @Get('test-statistic')
  // async getTestStatistic(
  //   @Query('branchId') branchId?: string,
  //   @Query('nominationId') nominationId?: string,
  // ) {
  //   return await this.statisticService.getTestResults(+branchId, +nominationId);
  // }
}
