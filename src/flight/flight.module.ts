import { Module } from '@nestjs/common';
import { FlightService } from './flight.service';
import { FlightController } from './flight.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [FlightController],
  providers: [PrismaService,FlightService],
})
export class FlightModule {}
