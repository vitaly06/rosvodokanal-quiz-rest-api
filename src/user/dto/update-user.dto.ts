import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateUserRequest {
  @ApiProperty({
    name: 'fullNameId',
    description: 'id ФИО',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  fullNameId?: string;

  @ApiProperty({
    name: 'branchId',
    description: 'id филиала',
    example: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: 'id филиала должен быть числом' })
  @IsPositive({ message: 'id филиала должен быть положительным' })
  @IsOptional()
  branchId?: string;
}
