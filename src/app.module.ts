import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { NominationModule } from './nomination/nomination.module';
import { BranchModule } from './branch/branch.module';
import { QuestionModule } from './question/question.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AnswerModule } from './answer/answer.module';
import { TestModule } from './test/test.module';
import { CategoryModule } from './category/category.module';
import { StatisticModule } from './statistic/statistic.module';
import { PracticeTaskModule } from './practice-task/practice-task.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NominationModule,
    BranchModule,
    QuestionModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AnswerModule,
    TestModule,
    CategoryModule,
    StatisticModule,
    PracticeTaskModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
