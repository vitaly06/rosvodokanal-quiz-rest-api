import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAdminRequest } from './dto/register.dto';
import { LoginAdminRequest } from './dto/login.dto';
import { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthResponse } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Регистрация админа',
    description: 'Создаёт аккаунт администратора',
  })
  @ApiOkResponse({ description: 'Успешная Авторизация' })
  @ApiBadRequestResponse({ description: 'Неккоректные входные данные' })
  @ApiConflictResponse({
    description: 'Пользователь с таким логином уже существует',
  })
  @HttpCode(200)
  @Post('admin/register')
  async register(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterAdminRequest,
  ) {
    return this.authService.registerAdmin(res, dto);
  }

  @ApiOperation({
    summary: 'Авторизация админа',
    description: 'Позволяет войти в аккаунт администратора',
  })
  @ApiOkResponse({ description: 'Успешная Авторизация' })
  @ApiNotFoundResponse({
    description: 'Пользователь с таким логином не найден',
  })
  @ApiUnauthorizedResponse({ description: 'Неверный пароль' })
  @HttpCode(200)
  @Post('admin/login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginAdminRequest,
  ) {
    return this.authService.loginAdmin(res, dto);
  }

  @ApiOperation({
    summary: 'Обновление токена',
    description: 'Возвращает новый токен доступа',
  })
  @ApiOkResponse({ type: AuthResponse })
  @ApiUnauthorizedResponse({ description: 'Недействительный refresh_token' })
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.refresh(req, res);
  }

  @ApiOperation({
    summary: 'Выход из системы',
  })
  @HttpCode(200)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Get('me')
  @HttpCode(200)
  async me(@Req() req: Request) {
    return req.user;
  }
}
