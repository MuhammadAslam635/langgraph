import { ApiProperty } from "@nestjs/swagger";

export class CreateTransactionDto {
    @ApiProperty({
        description:"user who by ticket and paid amount",
        example:"user id should be integer"
    })
    userId:number;
    @ApiProperty({
        description:"booking should be exist in bookings table",
        example:"booking id should be integer"
    })
    bookingId:number;
    @ApiProperty({
        description:"Charges of ticket",
        example:"100"
    })
    charges:number;
    @ApiProperty({
        description:"status of transaction",
        example:"success, failed"
    })
    status:string;
}
