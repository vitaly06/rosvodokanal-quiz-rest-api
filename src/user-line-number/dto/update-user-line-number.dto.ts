import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateUserLineNumberDto {
  @ApiProperty({ description: 'ID участника' })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'ID практической номинации' })
  @IsInt()
  practicNominationId: number;

  @ApiProperty({ description: 'Номер линии (1, 2, 3...)', required: false })
  @IsInt()
  @IsOptional()
  lineNumber?: number;
}
