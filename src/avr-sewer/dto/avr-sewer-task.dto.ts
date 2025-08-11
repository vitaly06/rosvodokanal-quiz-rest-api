import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  Matches,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateAvrSewerTaskDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  branchId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  taskNumber: number;

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
  @Max(5)
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
