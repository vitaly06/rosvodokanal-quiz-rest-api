import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { TestService } from './test.service';
import { StartTestDto } from './dto/start-test.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request, Response } from 'express';

@Controller('tests')
export class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('start')
  async startTest(
    @Body() dto: StartTestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.testService.startTest(dto);
    // Устанавливаем куку с sessionId
    res.cookie('testSession', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 день
    });
    return result;
  }

  @Post('finish')
  async finishTest(
    @Req() req: Request,
    @Body()
    body: {
      answers: Array<{ questionId: number; optionId: number | null }>;
      fullName?: string;
      branchId?: number;
    },
  ) {
    const sessionId = req.cookies?.testSession;
    if (!sessionId) {
      throw new BadRequestException('Сессия не найдена');
    }
    return this.testService.finishTest(
      sessionId,
      body.answers,
      body.fullName,
      body.branchId,
    );
  }

  @Get('session')
  async getSessionData(@Req() req: Request) {
    const sessionId = req.cookies?.testSession;
    if (!sessionId) {
      throw new BadRequestException('Сессия не найдена');
    }
    return this.testService.getSessionData(sessionId);
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
