import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService){}
  async create(createTransactionDto: CreateTransactionDto) {
    try {
      const transaction  = await this.prisma.transaction.create({
        data:{
          userId:createTransactionDto.userId,
          bookingId:createTransactionDto.bookingId,
          charges:createTransactionDto.charges
        }
      });
      return{
        status:"success",
        message:"New Transaction added Successfully",
        data:transaction
      };

    } catch (error) {
      return{
        status:"error",
        message:error.message
      }
    }
  }

  async findAll() {
    try {
      const transactions = await this.prisma.transaction.findMany();
      return{
        status:"success",
        message:"Get All transactions successfully.",
        data:transactions
      }
    } catch (error) {
      return{
        status:"error",
        message:error.message
      }
    }
  }

  async findOne(id: number) {
   try {
    const transaction = await this.prisma.transaction.findUnique({
      where:{
        id:id
      }
    });
    return{
      status:"success",
      message:"Get transaction successfully.",
      data:transaction
    }
   } catch (error) {
    return{
      status:"error",
      message:error.message
    }
   }
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    try {
      const transaction = this.prisma.transaction.delete({
        where:{
          id:id
        }
      });
      return{
        status:"success",
        message:"Transaction deleted successfully.",
        data:transaction
      }
     } catch (error) {
      return{
        status:"error",
        message:error.message
      }
     }
  }
}
