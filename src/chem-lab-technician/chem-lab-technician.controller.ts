import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChemLabTechnicianService } from './chem-lab-technician.service';
import { UpdateChemLabTechnicianDto } from './dto/chem-lab-technician.dto';

@ApiTags('Лучший лаборант химического анализа - 2025')
@Controller('chem-lab-technician')
export class ChemLabTechnicianController {
  constructor(private readonly service: ChemLabTechnicianService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateChemLabTechnicianDto) {
    return this.service.updateTask(dto);
  }

  @Get('calculate')
  async calculateResults() {
    return this.service.calculateResults();
  }
}
