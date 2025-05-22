import { Module } from '@nestjs/common';
import { CustomercarebotService } from './customercarebot.service';
import { CustomercarebotController } from './customercarebot.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { FlightService } from 'src/flight/flight.service';
import { TicketService } from 'src/ticket/ticket.service';
import { BookingService } from 'src/booking/booking.service';
import { TransactionService } from 'src/transaction/transaction.service';

@Module({
  controllers: [CustomercarebotController],
  providers: [PrismaService,CustomercarebotService,FlightService,TicketService,BookingService,TransactionService],
})
export class CustomercarebotModule {}
