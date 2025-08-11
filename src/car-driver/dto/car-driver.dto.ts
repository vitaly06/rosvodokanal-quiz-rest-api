import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateCarDriverTaskDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  userId: number;

  // // Теоретическая часть
  // @ApiProperty({ required: false })
  // @IsInt()
  // @Min(0)
  // @IsOptional()
  // @Type(() => Number)
  // theoryCorrect?: number;

  // @ApiProperty({ example: '05:30', required: false })
  // @IsString()
  // @Matches(/^([0-5]?\d):([0-5]?\d)$/, {
  //   message: 'Время должно быть в формате мм:сс',
  // })
  // @IsOptional()
  // theoryTime?: string;

  // Практическая часть
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  practicePenalty?: number;

  @ApiProperty({ example: '03:45', required: false })
  @IsString()
  @Matches(/^([0-5]?\d):([0-5]?\d)$/, {
    message: 'Время должно быть в формате мм:сс',
  })
  @IsOptional()
  practiceTime?: string;
}
