import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateCategoryRequest {
  @ApiProperty({
    name: 'name',
    description: 'Название категории',
    example: 'Первая мед. помощь',
  })
  @IsString({ message: 'Название категории должно быть строкой' })
  @IsNotEmpty({ message: 'Название обязательно для заполнения' })
  name: string;
  @ApiProperty({
    name: 'nominationId',
    description: 'Id номинации',
    example: 3,
    type: Number,
  })
  @IsNumber({}, { message: 'Id номинации должен быть числом' })
  @IsInt({ message: 'Id номинации должен быть целым числом' })
  @IsPositive({ message: 'Id номинации должен быть положительным числом' })
  nominationId: number;
}
