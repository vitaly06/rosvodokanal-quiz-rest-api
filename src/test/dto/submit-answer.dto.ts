import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  questionId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  answerId: string;
}
