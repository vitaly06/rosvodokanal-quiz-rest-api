import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsPositive, IsString } from 'class-validator';

export class FinishTestDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  branchId: number;

  @ApiProperty()
  @IsDateString()
  startedAt: string;
}
