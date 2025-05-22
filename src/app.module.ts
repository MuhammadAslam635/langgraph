import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AirlineModule } from './airline/airline.module';
import { CustomercarebotModule } from './customercarebot/customercarebot.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { FlightModule } from './flight/flight.module';
import { TicketModule } from './ticket/ticket.module';
import { BookingModule } from './booking/booking.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [AirlineModule, CustomercarebotModule, PrismaModule, UserModule, FlightModule, TicketModule, BookingModule, TransactionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
