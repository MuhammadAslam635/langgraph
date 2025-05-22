import { ApiProperty } from "@nestjs/swagger";

export class CreateFlightDto {
    @ApiProperty({
        description: 'The name of the flight',
        example: 'Emirate Pak To Dubai',
    })
    name: string;
    @ApiProperty({
        description: 'The destination of the flight',
        example: 'Emirate flight 001 from Pakistan to UAE Dubai',
    })
    destination: string;
    @ApiProperty({
        description:"Flight Campany",
        example:"Emirate, Turkia, PIA etc"
    })
    company:string;
    @ApiProperty({
        description:"Flight Date",
        example:"2025-01-01"
    })
    flightDate:string;
    @ApiProperty({
        description:"Flight Time",
        example:"10:00"
    })
    departureTime:string;
    @ApiProperty({
        description:"Flight Time",
        example:"10:00"
    })
    arrivalTime:string;
    @ApiProperty({
        description:"Flight Departure",
        example:"Karachi"
    })
    departure:string;
}
