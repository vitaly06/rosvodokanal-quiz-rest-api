import { Module } from '@nestjs/common';
import { FullNameService } from './full-name.service';
import { FullNameController } from './full-name.controller';

@Module({
  controllers: [FullNameController],
  providers: [FullNameService],
})
export class FullNameModule {}
