import { ApiProperty} from '@nestjs/swagger';

export class UpdateTicketDto{
    @ApiProperty({
        description:"Flight Seat Type like: Economy, Business",
        example:"Econony, Business"
    })
    type:string;
    @ApiProperty({
        description:"Ticket Price",
        example:"100, 150, 250"
    })
    price:number;
    @ApiProperty({
        description:"Flight Id",
        example:"Like flight 10, 11"
    })
    flightId:number;
    @ApiProperty({
        description:"Ticket Status",
        example:"Available, Booked, Cancelled"
    })
    status:string;

}
