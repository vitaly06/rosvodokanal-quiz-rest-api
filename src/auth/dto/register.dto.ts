import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAdminRequest {
  @IsString({ message: 'Логин должен быть строкой' })
  @IsNotEmpty({ message: 'Логин не может быть пустым' })
  login: string;
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  @MinLength(6, { message: 'Минимальная длина пароль 6 символов' })
  password: string;
}
