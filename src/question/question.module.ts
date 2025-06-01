import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/questions',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
    JwtModule,
  ],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}
