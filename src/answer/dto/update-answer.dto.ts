import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsPositive, IsString } from 'class-validator';

export class UpdateAnswerRequest {
  @ApiProperty({
    name: 'answer',
    description: 'Ответ на вопрос',
    example: '4 яблока',
    required: false,
  })
  @IsString({ message: 'Ответ должен быть строкой' })
  answer?: string;
  @ApiProperty({
    name: 'correctness',
    description: 'Правильность ответа',
    example: true,
    required: false,
  })
  @IsBoolean({ message: 'Правильность ответа должна быть true/false' })
  correctness?: boolean;
  @ApiProperty({
    name: 'questionId',
    description: 'id вопроса',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'id вопроса должен быть целым числом' })
  @IsPositive({ message: 'id вопроса должен быть положительным числом' })
  questionId?: number;
}
