import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TestService } from './test.service';
import { StartTestDto } from './dto/start-test.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { FinishTestDto } from './dto/finish-test.dto';
import { PrismaService } from 'src/prisma/prisma.service';

// test.controller.ts
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

  @Post(':userId/answer')
  async submitAnswer(
    @Param('userId') userId: number,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.testService.submitAnswer(+userId, dto);
  }

  @Post(':userId/finish')
  async finishTest(
    @Param('userId') userId: number,
    @Body() dto: FinishTestDto,
  ) {
    return this.testService.finishTest(+userId, dto);
  }

  @Get(':userId/results')
  async getResults(@Param('userId') userId: number) {
    return this.prisma.testResult.findMany({
      where: { userId },
      include: { nomination: true },
    });
  }
}
