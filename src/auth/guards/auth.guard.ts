import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.cookies?.accessToken) {
      request.headers.authorization = `Bearer ${request.cookies.accessToken}`;
    }

    return super.canActivate(context);
  }
}
