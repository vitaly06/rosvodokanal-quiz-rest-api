import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserRequest } from './dto/create-user.dto';
import { UpdateUserRequest } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        number: true,
        fullName: {
          select: {
            branch: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number): Promise<User> {
    const existUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existUser) {
      throw new NotFoundException('Пользователь с таким id не найден');
    }
    return existUser;
  }

  async create(dto: CreateUserRequest): Promise<User> {
    const { number } = { ...dto };

    const existUser = await this.prisma.user.findUnique({
      where: { number },
    });
    if (existUser) {
      throw new BadRequestException(
        'Пользователь с таким номером уже существует',
      );
    }
    return await this.prisma.user.create({
      data: {
        number,
      },
    });
  }

  async updateUser(userId: number, dto: UpdateUserRequest) {
    const { fullNameId, branchId } = { ...dto };

    await this.findById(userId);

    if (fullNameId != undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fullName: {
            connect: { id: +fullNameId },
          },
        },
      });
    }

    if (branchId != undefined) {
      const existBranch = await this.prisma.branch.findUnique({
        where: { id: +branchId },
      });
      if (!existBranch) {
        throw new NotFoundException('Филиала с таким id не существует');
      }
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          fullName: {
            update: {
              data: {
                branchId: +branchId,
              },
            },
          },
        },
      });
    }

    return await this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async delete(id: number) {
    await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { succes: true };
  }
}
