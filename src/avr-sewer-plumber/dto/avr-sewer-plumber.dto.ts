import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateAvrSewerPlumberTaskDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  userId: number;

  @ApiProperty({ example: '15:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/, {
    message: 'Время должно быть в формате мм:сс',
  })
  time: string;

  @ApiProperty()
  @IsBoolean()
  hydraulicTest: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  @Type(() => Number)
  safetyPenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  @Type(() => Number)
  culturePenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  qualityPenalty?: number;
}
