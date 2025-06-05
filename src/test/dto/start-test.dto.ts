import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString } from 'class-validator';

// start-test.dto.ts
export class StartTestDto {
  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  nominationId: number;
}
