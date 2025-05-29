import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateNominationRequest {
  @ApiProperty({
    name: 'name',
    description: 'Название номинации',
    example: 'test Nomination',
  })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  @IsString({ message: 'Название должно быть строкой' })
  name: string;
  @ApiProperty({
    name: 'duration',
    description: 'Время прохождения теста(HH:MM:SS)',
    example: '00:45:00',
  })
  @IsNotEmpty({ message: 'Время прохождения не может быть пустым' })
  @IsString({ message: 'Время прохождения должно быть строкой' })
  @Matches(/^\d{2}:\d{2}:\d{2}$/, {
    message: 'Формат времени должен быть HH:MM:SS',
  })
  duration: string;
  @ApiProperty({
    name: 'questionsCount',
    description: 'Количество вопросов в тесте',
    example: 25,
  })
  @IsPositive({
    message: 'Количество вопросов не может быть отрицательным числом',
  })
  @IsInt({ message: 'Количество вопросов должно быть числом' })
  @IsNotEmpty({ message: 'Количество вопросов обязательно для заполнения' })
  questionsCount: number;
}
