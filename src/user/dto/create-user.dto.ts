import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({
    name: 'number',
    description: 'Уникальный номер человека (строка)',
    example: '123456',
  })
  @IsString({ message: 'Номер пользователя должен передаваться строкой' })
  @IsNotEmpty({ message: 'Номер пользователя не может быть пустым' })
  @MinLength(5, { message: 'Минимальная длина номера - 5 символов' })
  @MaxLength(20, { message: 'Максимальная длина номера - 20 символов' })
  number: string;
}
