// get-practice-table.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class GetPracticeTableDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  nominationId?: number;
}

// update-practice-task.dto.ts

export class UpdatePracticeTaskDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  score?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  time?: string; // Формат "мм:сс"

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  penalty?: number;
}
