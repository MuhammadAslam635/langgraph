import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from "bcrypt"
import { UserResponseDto } from './dto/user-response.dto';
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Hash the password before saving to the database
    const hashedPassword = await bcrypt.hash(createUserDto.password, Number(process.env.SALTROUNDS));

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name.toLowerCase(),
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
      },
    });
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
    return userResponse;
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany()
      return users.map(user => ({
        name: user.name,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
      }));
    } catch (error) {
      return error.message;
    }
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id: id }
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return this.prisma.user.delete({
      where: {
        id: id
      }
    });
  }
}
