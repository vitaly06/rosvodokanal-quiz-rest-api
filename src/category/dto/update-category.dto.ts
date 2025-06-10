import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class UpdateCategoryRequest {
  @ApiProperty({
    name: 'name',
    description: 'Название категории',
    example: 'Первая мед. помощь',
    required: false,
  })
  @IsString({ message: 'Название категории должно быть строкой' })
  @IsOptional()
  name: string;
  @ApiProperty({
    name: 'nominationId',
    description: 'Id номинации',
    example: 3,
    type: Number,
    required: false,
  })
  @IsNumber({}, { message: 'Id номинации должен быть числом' })
  @IsInt({ message: 'Id номинации должен быть целым числом' })
  @IsPositive({ message: 'Id номинации должен быть положительным числом' })
  @IsOptional()
  nominationId: number;
}
