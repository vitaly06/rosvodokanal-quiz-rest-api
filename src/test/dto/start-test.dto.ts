import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Length } from 'class-validator';

// start-test.dto.ts
export class StartTestDto {
  @Length(6, 6, { message: 'Длина номера должна быть 6 символов' })
  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  nominationId: number;
}
