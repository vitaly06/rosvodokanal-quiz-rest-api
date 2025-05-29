import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBranchRequest {
  @ApiProperty({
    name: 'address',
    description: 'Адрес филиала',
    example: 'г. Оренбург, ул. Чкалова 11',
  })
  @IsNotEmpty({ message: 'Адрес обязателен для заполнения' })
  @IsString({ message: 'Адрес должен быть строкой' })
  address: string;
}
