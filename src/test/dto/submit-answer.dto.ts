import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class SubmitAnswersDto {
  @ApiProperty({ type: () => AnswerDto, isArray: true })
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

export class AnswerDto {
  @ApiProperty()
  @IsInt()
  questionId: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  optionId?: number | null;
}
