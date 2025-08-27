import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateChemLabTechnicianDto {
  @ApiProperty()
  @Type(() => Number)
  userId: number;

  // Этап 1a
  @ApiProperty({ required: false, example: '05:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/)
  @IsOptional()
  stage1aTime?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1aQuality?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1aCulture?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1aSafety?: number;

  // Этап 1b
  @ApiProperty({ required: false, example: '05:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/)
  @IsOptional()
  stage1bTime?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1bQuality?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1bCulture?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage1bSafety?: number;

  // Этап 2
  @ApiProperty({ required: false, example: '05:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/)
  @IsOptional()
  stage2Time?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage2Quality?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage2Culture?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stage2Safety?: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isBest?: boolean;
}
