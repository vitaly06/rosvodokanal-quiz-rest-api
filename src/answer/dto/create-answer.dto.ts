import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateAnswerRequest {
  @ApiProperty({
    name: 'answer',
    description: 'Ответ на вопрос',
    example: '4 яблока',
  })
  @IsNotEmpty({ message: 'Ответ не может быть пустым' })
  @IsString({ message: 'Ответ должен быть строкой' })
  answer: string;
  @ApiProperty({
    name: 'correctness',
    description: 'Правильность ответа',
    example: true,
  })
  @IsBoolean({ message: 'Правильность ответа должна быть true/false' })
  @IsNotEmpty({ message: 'Корректность не может быть пустой' })
  correctness: boolean;
  @ApiProperty({
    name: 'questionId',
    description: 'id вопроса',
    example: 1,
  })
  @IsInt({ message: 'id вопроса должен быть целым числом' })
  @IsPositive({ message: 'id вопроса должен быть положительным числом' })
  questionId: number;
}
