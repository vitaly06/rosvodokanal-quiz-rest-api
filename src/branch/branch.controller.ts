import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { Branch } from '@prisma/client';
import { CreateBranchRequest } from './dto/create-branch.dto';
import { UpdateBranchRequest } from './dto/update-branch.dto';
import { ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('branch')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @ApiOperation({
    summary: 'Получение всех филиалов',
  })
  @Get('all')
  async findAll(): Promise<Branch[]> {
    return await this.branchService.findAll();
  }

  @ApiOperation({
    summary: 'Получение филиала по id',
  })
  @Get('by-id/:id')
  async findById(@Param('id') id: string): Promise<Branch> {
    return await this.branchService.findById(+id);
  }

  @ApiOperation({
    summary: 'Создание филиала',
  })
  @UseGuards(AdminGuard)
  @Post('create')
  async create(@Body() dto: CreateBranchRequest): Promise<Branch> {
    return await this.branchService.create(dto);
  }

  @ApiOperation({
    summary: 'Обновление филиала по id',
  })
  @UseGuards(AdminGuard)
  @Put('update/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateBranchRequest) {
    return await this.branchService.update(+id, dto);
  }

  @ApiOperation({
    summary: 'Удаление филиала по id',
  })
  @UseGuards(AdminGuard)
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return await this.branchService.delete(+id);
  }
}
