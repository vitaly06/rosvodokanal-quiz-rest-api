import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/interfaces/jwt.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as Request;

    const token = request.cookies['access_token'];
    console.log(token);
    if (!token) {
      throw new UnauthorizedException('Вы не авторизованы');
    }

    const payload: JwtPayload = await this.jwtService.verifyAsync(token);
    if (payload) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: +payload.id },
      });
      if (!admin) {
        throw new ForbiddenException('Недостаточно прав для данного действия');
      }
    }
    return true;
  }
}
