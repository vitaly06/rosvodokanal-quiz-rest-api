import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { UserLineNumberService } from './user-line-number.service';
import { UpdateUserLineNumberDto } from './dto/update-user-line-number.dto';

@Controller('user-line-number')
export class UserLineNumberController {
  constructor(private readonly service: UserLineNumberService) {}

  @Patch()
  async upsertLineNumber(@Body() dto: UpdateUserLineNumberDto) {
    return this.service.upsertLineNumber(dto);
  }

  @Get()
  async getLineNumber(
    @Query('userId') userId: number,
    @Query('practicNominationId') practicNominationId: number,
  ) {
    return this.service.getLineNumber(userId, practicNominationId);
  }
}
