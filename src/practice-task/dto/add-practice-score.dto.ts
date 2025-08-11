// get-practice-table.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class GetPracticeTableDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  nominationId?: number;
}

// update-practice-task.dto.ts

export class UpdatePracticeTaskDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  branchId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  nominationId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  taskNumber: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  score?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  penalty?: number;
}
