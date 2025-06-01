import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateQuestionRequest {
  @ApiProperty({
    name: 'question',
    description: 'Текст вопроса',
    example: 'Сколько будет 2+2?',
  })
  @IsNotEmpty({ message: 'Вопрос не может быть пустым' })
  @IsString({ message: 'Вопрос должен быть строкой' })
  question: string;
  @ApiProperty({
    name: 'nominationId',
    description: 'id Номинации',
    example: 1,
  })
  @IsInt({ message: 'id номинации должен быть целым числом' })
  @IsPositive({ message: 'id должен быть положительным числом' })
  nominationId: number;
}
