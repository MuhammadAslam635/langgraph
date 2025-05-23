import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BookingController],
  providers: [PrismaService,BookingService],
})
export class BookingModule {}
