import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class UpdateUserRequest {
  @ApiProperty({
    name: 'fullName',
    description: 'Уникальный номер человека (строка)',
    example: 'Садиков Виталий Дмитриевич',
  })
  @IsString({ message: 'ФИО должно быть строкой' })
  @IsNotEmpty({ message: 'ФИО не может быть пустым' })
  fullName: string;

  @ApiProperty({
    name: 'branchId',
    description: 'id филиала',
    example: 1,
  })
  @IsInt({ message: 'id филиала должен быть числом' })
  @IsPositive({ message: 'id филиала должен быть положительным' })
  branchId: string;
}
