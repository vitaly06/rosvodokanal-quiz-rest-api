import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { BranchLineNumberService } from './branch-line-number.service';
import { UpdateLineNumberDto } from './dto/update-line-number.dto';

@Controller('branch-line-number')
export class BranchLineNumberController {
  constructor(private readonly service: BranchLineNumberService) {}

  @Patch()
  async upsertLineNumber(@Body() dto: UpdateLineNumberDto) {
    return this.service.upsertLineNumber(dto);
  }

  @Get()
  async getLineNumber(
    @Query('branchId') branchId: string,
    @Query('practicNominationId') practicNominationId: string,
  ) {
    return this.service.getLineNumber(+branchId, +practicNominationId);
  }
}
