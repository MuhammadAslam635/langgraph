import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TicketController],
  providers: [PrismaService,TicketService],
})
export class TicketModule {}
