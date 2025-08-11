import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { IsInt } from 'class-validator';
import { IsNumber } from 'class-validator';
import { IsOptional } from 'class-validator';
import { Max } from 'class-validator';
import { Min } from 'class-validator';

export class UpdateWelderTaskDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  branchId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(2)
  @Type(() => Number)
  taskNumber: number;

  @ApiProperty()
  @IsString()
  participantName: string;

  @ApiProperty({ example: '15:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/, {
    message: 'Время должно быть в формате мм:сс',
  })
  time: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  culturePenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  safetyPenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  operationalControl?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  visualMeasurement?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  radiographicControl?: number;
}
