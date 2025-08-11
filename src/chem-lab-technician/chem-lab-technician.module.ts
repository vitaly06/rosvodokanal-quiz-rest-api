import { Module } from '@nestjs/common';
import { ChemLabTechnicianService } from './chem-lab-technician.service';
import { ChemLabTechnicianController } from './chem-lab-technician.controller';

@Module({
  controllers: [ChemLabTechnicianController],
  providers: [ChemLabTechnicianService],
})
export class ChemLabTechnicianModule {}
