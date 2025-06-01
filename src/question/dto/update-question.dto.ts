import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuestionRequest {
  @ApiProperty({
    name: 'question',
    description: 'Текст вопроса',
    example: 'Сколько будет 2+2?',
    required: false,
  })
  question?: string;
  @ApiProperty({
    name: 'nominationId',
    description: 'id Номинации',
    example: 1,
    required: false,
  })
  nominationId?: number;
}
