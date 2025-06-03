import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterAdminRequest } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt.interface';
import { LoginAdminRequest } from './dto/login.dto';
import { Request, Response } from 'express';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TOKEN_TTL: string;
  private readonly JWT_REFRESH_TOKEN_TTL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.JWT_ACCESS_TOKEN_TTL = this.configService.getOrThrow<string>(
      'JWT_ACCESS_TOKEN_TTL',
    );
    this.JWT_REFRESH_TOKEN_TTL = this.configService.getOrThrow<string>(
      'JWT_REFRESH_TOKEN_TTL',
    );
  }

  async registerAdmin(res: Response, dto: RegisterAdminRequest) {
    const { login, password } = { ...dto };

    const existAdmin = await this.prisma.admin.findUnique({
      where: { login },
    });
    if (existAdmin) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }
    const admin = await this.prisma.admin.create({
      data: {
        login,
        password: await bcrypt.hash(password, 10),
      },
    });

    return this.auth(res, String(admin.id));
  }

  async loginAdmin(res: Response, dto: LoginAdminRequest) {
    const { login, password } = { ...dto };

    const existAdmin = await this.prisma.admin.findUnique({
      where: { login },
    });
    if (!existAdmin) {
      throw new NotFoundException('Пользователь с таким логином не найден');
    }
    const checkPassword = await bcrypt.compare(password, existAdmin.password);
    if (!checkPassword) {
      throw new UnauthorizedException('Неверный пароль');
    }
    return this.auth(res, String(existAdmin.id));
  }

  async refresh(req: Request, res: Response) {
    const refresh_token = req.cookies['refresh_token'];
    if (!refresh_token) {
      throw new UnauthorizedException('Недействительный refresh_token');
    }

    const payload: JwtPayload =
      await this.jwtService.verifyAsync(refresh_token);

    if (payload) {
      const user = await this.prisma.admin.findUnique({
        where: { id: +payload.id },
        select: {
          id: true,
        },
      });
      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

      return this.auth(res, String(user.id));
    }
  }

  async logout(res: Response) {
    this.setCookie(res, 'refresh_token', '', new Date(0));
    this.setCookie(res, 'access_token', '', new Date(0));
    return { succes: true };
  }

  private async auth(res: Response, id: string) {
    const { access_token, refresh_token } = await this.generateToken(id);

    this.setCookie(
      res,
      'access_token',
      access_token,
      new Date(Date.now() + 60 * 60 * 2 * 1000),
    );
    this.setCookie(
      res,
      'refresh_token',
      refresh_token,
      new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    );

    return { success: true };
  }

  async validate(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: +id },
    });
    if (!admin) {
      throw new NotFoundException('Пользователь не найден');
    }

    return admin;
  }

  async generateToken(id: string) {
    const payload: JwtPayload = { id };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TOKEN_TTL,
    });
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TOKEN_TTL,
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private setCookie(res: Response, name: string, value: string, expires: Date) {
    res.cookie(name, value, {
      httpOnly: true,
      expires,
      secure: false,
      sameSite: 'strict',
    });
  }
}
