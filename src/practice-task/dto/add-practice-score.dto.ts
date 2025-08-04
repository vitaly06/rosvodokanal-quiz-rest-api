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
  @Type(() => Number)
  id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  score?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  time?: string; // Формат "мм:сс"

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  penalty?: number;
}
