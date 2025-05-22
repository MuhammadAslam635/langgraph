import { Injectable } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService){}
  create(createTicketDto: CreateTicketDto) {
    try {
       const ticket = this.prisma.ticket.create({
        data:{
          type:createTicketDto.type.toLowerCase(),
          price:createTicketDto.price,
          flightId:createTicketDto.flightId
        }
       });
      return {
        status:"success",
        message:"Ticket created Successfuly",
        data:ticket
      }
    } catch (error) {
      return {
        status:"error",
        message:error.message
      }
    }
  }

  async findAll() {
   try {
    const tickets = await this.prisma.ticket.findMany();
    return {
      status:"success",
      message:"Tickets fetched successfully",
      data:tickets
    }
   } catch (error) {
    return {
      status:"error",
      message:error.message
    }
   }
  }
  async findAllByFlightId(flightId) {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where:{
          flightId:flightId
        }
      });
      return {
        status:"success",
        message:"Tickets fetched successfully",
        data:tickets
      }
    } catch (error) {
      return {
        status:"error",
        message:error.message
      }
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }

  async update(id, updateTicketDto: UpdateTicketDto) {
      try {
        const ticket = await this.prisma.ticket.update({
          where:{id},
          data:updateTicketDto
        })
        return {
          status:"success",
          message:"Ticket updated successfully",
          data:ticket
        }
      } catch (error) {
        return {
          status:"error",
          message:error.message
        }
      }
  }

  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }
}
