import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateLineNumberDto {
  @ApiProperty({ description: 'ID филиала' })
  @IsInt()
  branchId: number;

  @ApiProperty({ description: 'ID практической номинации' })
  @IsInt()
  practicNominationId: number;

  @ApiProperty({ description: 'Номер линии (1, 2, 3...)', required: false })
  @IsInt()
  @IsOptional()
  lineNumber?: number;
}
