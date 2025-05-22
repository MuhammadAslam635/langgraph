import { ApiProperty } from "@nestjs/swagger";

export class CreateBookingDto {
    @ApiProperty({
        description:"Client Id comes from users table",
        example:"1, 2, 3 ..."
    })
    userId: number;
    @ApiProperty({
        description:"Flight id  comes from flights table",
        example:"flight id shuld be integer"
    })
    ticketId:number;
    @ApiProperty({
        description:"Booking Status",
        example:"status should be string"
    })
    status:string;
}
