import { Injectable } from '@nestjs/common';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class FlightService {
  constructor(private prisma: PrismaService) { }
  async create(createFlightDto: CreateFlightDto) {
    try {
      const flight = await this.prisma.flight.create({
        data: {
          name: createFlightDto.name,
          slug: slugify(createFlightDto.name).toLowerCase(), // ensure slug is provided or generated
          destination: createFlightDto.destination.toLowerCase(),
          company: createFlightDto.company.toLowerCase(),
          // Convert the flightDate string ("YYYY-MM-DD") into a Date object.
          flightDate: new Date(createFlightDto.flightDate),
          // Convert departureTime ("HH:mm") into a Date object using a fixed base date.
          departureTime: new Date(`1970-01-01T${createFlightDto.departureTime}:00Z`),
          // Convert arrivalTime ("HH:mm") similarly.
          arrivalTime: new Date(`1970-01-01T${createFlightDto.arrivalTime}:00Z`),
          departure: createFlightDto.departure.toLowerCase(),
        },
      });
      return { status: 'success', data: flight };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
  

  async findAll() {
    try {
      const flights = this.prisma.flight.findMany();
      return {
        status: "success",
        message: "Get All Flights Successfully.",
        data: flights
      }
    } catch (error) {
      return {
        status: "error",
        message: error.message
      }
    }
  }

  findOne(id: number) {
    try {
      const flight = this.prisma.flight.findUnique({
        where: {
          id: id
        }
      });
      return {
        status: "success",
        message: "Flight find successfully.",
        data: flight
      }
    } catch (error) {
      return {
        status: "error",
        message: error.message
      }
    }
  }

  update(id: number, updateFlightDto: UpdateFlightDto) {
    return `This action updates a #${id} flight`;
  }

  remove(id: number) {
    try {
      const flight = this.prisma.flight.delete({
        where: {
          id: id
        }
      });
      return {
        status: "success",
        message: "Deleted Successfully",
        data: flight
      }
    } catch (error) {
      return {
        status: "error",
        message: error.message
      }
    }
  }
}
