import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { NominationModule } from './nomination/nomination.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NominationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
