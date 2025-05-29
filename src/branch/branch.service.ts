import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBranchRequest } from './dto/create-branch.dto';
import { UpdateBranchRequest } from './dto/update-branch.dto';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Branch[]> {
    return await this.prisma.branch.findMany();
  }

  async findById(id: number): Promise<Branch> {
    const existBranch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!existBranch) {
      throw new NotFoundException('Филиала с таким id не найдено');
    }
    return existBranch;
  }

  async create(dto: CreateBranchRequest): Promise<Branch> {
    const { address } = { ...dto };
    const existBranch = await this.prisma.branch.findUnique({
      where: { address },
    });

    if (existBranch) {
      throw new BadRequestException('Филиал с таким адресом уже существует');
    }

    return await this.prisma.branch.create({
      data: {
        address,
      },
    });
  }

  async update(id: number, dto: UpdateBranchRequest) {
    const { address } = { ...dto };

    const existBranch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!existBranch) {
      throw new NotFoundException('Филиал с таким id не найден');
    }
    const checkAddress = await this.prisma.branch.findUnique({
      where: { address },
    });
    if ((checkAddress && checkAddress.id == id) || !checkAddress) {
      await this.prisma.branch.update({
        where: { id },
        data: {
          address,
        },
      });
    }
    return { succes: true };
  }

  async delete(id: number) {
    const checkBranch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!checkBranch) {
      throw new NotFoundException('Филиал с таким id не найден');
    }
    await this.prisma.branch.delete({
      where: { id },
    });
  }
}
