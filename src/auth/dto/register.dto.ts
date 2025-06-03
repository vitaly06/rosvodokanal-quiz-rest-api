import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAdminRequest {
  @ApiProperty({
    description: 'Логин',
    example: 'Vitaly.vd2132',
  })
  @IsString({ message: 'Логин должен быть строкой' })
  @IsNotEmpty({ message: 'Логин не может быть пустым' })
  login: string;
  @ApiProperty({
    description: 'Пароль',
    example: 'hvyJldjY231',
    minLength: 6,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  @MinLength(6, { message: 'Минимальная длина пароля 6 символов' })
  password: string;
}
