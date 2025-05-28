import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAdminRequest } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('admin/register')
  async register(@Body() dto: RegisterAdminRequest) {
    return this.authService.registerAdmin(dto);
  }
}
