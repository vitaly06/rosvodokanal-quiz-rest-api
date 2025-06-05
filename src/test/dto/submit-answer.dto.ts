import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  questionId: number;

  @ApiProperty()
  @IsString()
  answer: string;
}
