import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class AnswerDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  questionId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  optionId: number; // Теперь это обязательное поле
}

export class SubmitAnswersDto {
  @ApiProperty({ type: [AnswerDto] })
  answers: AnswerDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  branchId?: number;
}
