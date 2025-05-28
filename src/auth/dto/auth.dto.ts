import { ApiProperty } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({
    description: 'JWT token',
  })
  access_token: string;
}
