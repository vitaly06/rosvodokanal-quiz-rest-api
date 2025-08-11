import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateAvrMechanicTaskDto {
  @ApiProperty()
  @IsInt()
  branchId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(3)
  taskNumber: number;

  @ApiProperty({ example: '15:30' })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/, {
    message: 'Время должно быть в формате мм:сс',
  })
  time: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hydraulicTest?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(15)
  @IsOptional()
  safetyPenalty?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  culturePenalty?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  qualityPenalty?: number;
}
