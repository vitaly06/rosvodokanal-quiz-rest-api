import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateUserRequest {
  @ApiProperty({
    name: 'fullName',
    description: 'Уникальный номер человека (строка)',
    example: 'Садиков Виталий Дмитриевич',
  })
  @IsString({ message: 'ФИО должно быть строкой' })
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    name: 'branchId',
    description: 'id филиала',
    example: 1,
    type: Number,
  })
  @IsInt({ message: 'id филиала должен быть числом' })
  @IsPositive({ message: 'id филиала должен быть положительным' })
  @IsOptional()
  branchId?: string;
}
