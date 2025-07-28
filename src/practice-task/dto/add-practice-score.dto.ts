import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class addPracticeScoreRequest {
  @ApiProperty({
    description: 'taskNumber',
    example: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Номер задачи обязателен для заполнения' })
  @IsNumber({}, { message: 'Номер задачи должен быть числом' })
  @IsPositive({ message: 'Номер задачи должен быть положительным числом' })
  @IsInt({ message: 'Номер задачи должен быть целым числом' })
  taskNumber: number;
  @ApiProperty({
    description: 'score',
    example: 7,
    type: Number,
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Количество баллов обязательно для заполнения' })
  @IsNumber({}, { message: 'Количество баллов должно быть числом' })
  @IsPositive({ message: 'Количество баллов должно быть положительным числом' })
  @IsInt({ message: 'Количество баллов должно быть целым числом' })
  score: number;
  @ApiProperty({
    description: 'branchId',
    example: 8,
    type: Number,
  })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Id филиала обязателен для заполнения' })
  @IsNumber({}, { message: 'Id филиала должен быть числом' })
  @IsPositive({ message: 'Id филиала должен быть положительным числом' })
  @IsInt({ message: 'Id филиала должен быть целым числом' })
  branchId: number;
}
