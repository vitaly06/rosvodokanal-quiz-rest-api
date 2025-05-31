import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { CreateUserRequest } from './dto/create-user.dto';
import { UpdateUserRequest } from './dto/update-user.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Получение всех пользователей',
  })
  @Get('all')
  async findAll(): Promise<User[]> {
    return await this.userService.findAll();
  }

  @ApiOperation({
    summary: 'Получение пользователя по id',
  })
  @Get('by-id/:id')
  async findById(@Param('id') id: string) {
    return await this.userService.findById(+id);
  }

  @ApiOperation({
    summary: 'Создание пользователя',
  })
  @Post('create')
  async create(@Body() dto: CreateUserRequest): Promise<User> {
    return await this.userService.create(dto);
  }

  @ApiOperation({
    summary: 'Обновление пользователя по id',
  })
  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserRequest,
  ): Promise<User> {
    return await this.userService.updateUser(+id, dto);
  }

  @ApiOperation({
    summary: 'Удаление пользователя по id',
  })
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return await this.userService.delete(+id);
  }
}
