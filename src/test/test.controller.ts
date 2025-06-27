import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TestService } from './test.service';
import { StartTestDto } from './dto/start-test.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('tests')
export class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('start')
  async startTest(@Body() dto: StartTestDto) {
    return this.testService.startTest(dto);
  }

  @Post(':userId/finish')
  async finishTest(
    @Param('userId') userId: number,
    @Body() dto?: Array<{ questionId: number; optionId: number | null }>,
  ) {
    return this.testService.finishTest(+userId, dto);
  }

  @Get(':userId/results')
  async getResults(@Param('userId') userId: string) {
    return await this.testService.getResult(+userId);
  }

  @Get('all-results')
  async getAllResults() {
    return await this.testService.getAllResult();
  }

  // таблица с ответами пользователя и верными ответами
  @Get('result-table/:userId/:nominationId')
  async getResultTable(
    @Param('userId') userId: string,
    @Param('nominationId') nominationId: string,
  ) {
    return await this.testService.getResultTable(+userId, +nominationId);
  }
}
