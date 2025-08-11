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
// import { PracticeTaskModule } from './practice-task/practice-task.module';
import { AvrMechanicModule } from './avr-mechanic/avr-mechanic.module';
import { WelderModule } from './welder/welder.module';
import { AvrPlumberModule } from './avr-plumber/avr-plumber.module';
import { AvrSewerModule } from './avr-sewer/avr-sewer.module';
import { AvrSewerPlumberModule } from './avr-sewer-plumber/avr-sewer-plumber.module';
import { CarDriverModule } from './car-driver/car-driver.module';
import { TruckDriverModule } from './truck-driver/truck-driver.module';
import { ChemLabTechnicianModule } from './chem-lab-technician/chem-lab-technician.module';

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
    // PracticeTaskModule,
    AvrMechanicModule,
    WelderModule,
    AvrPlumberModule,
    AvrSewerModule,
    AvrSewerPlumberModule,
    CarDriverModule,
    TruckDriverModule,
    ChemLabTechnicianModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
