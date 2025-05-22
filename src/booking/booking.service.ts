import { Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService){}
  async create(createBookingDto: CreateBookingDto) {
    try{
      const booking = await this.prisma.booking.create({
        data:{
          userId:createBookingDto.userId,
          ticketId:createBookingDto.ticketId,
          status:createBookingDto.status.toLowerCase(),
          bookedBy:"AI",
        }
      });
      return{
        status:"success",
        message:"Ticket booked Successfully.",
        data:booking
      };
    }catch(error){
      return {
        status:"error",
        message:error.message
      }
    }
  }

  async findAll() {
    try {
      const bookings = await this.prisma.booking.findMany();
      return{
        status:"success",
        message:"Get All bookings Detail.",
        data:bookings
      };
    } catch (error) {
      return {
        status:"error",
        message:error.message
      }
    }
  }

  async findOne(id: number) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where:{
          id:id
        }
      });
      return{
        status:"success",
        message:"Get Single Booking Detail Successfully",
        data:booking
      };
    } catch (error) {
      return {
        status:"error",
        message:error.message
      }
    }
  }
  async findById(id){
    try {
      const booking = await this.prisma.booking.findUnique({
        where:{
          id:id
        }
      });
      return {
        status:"success",
        message:"Get Booking Detail Successfully",
        data:booking
      }
    } catch (error) {
      return {
        status:"error",
        message:error.message
      }
    }
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    try {
      const book = this.prisma.booking.delete({
        where:{
          id:id
        }
      });
      return{
        status:"success",
        message:"Booking deleted successfully.",
        data:book
      };
    } catch (error) {
      return{
        status:"error",
        message:error.message
      }
    }
  }
}
