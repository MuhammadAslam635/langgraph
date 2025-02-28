import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomercarebotService } from './customercarebot.service';
import { CreateCustomercarebotDto } from './dto/create-customercarebot.dto';
import { UpdateCustomercarebotDto } from './dto/update-customercarebot.dto';

@Controller('customercarebot')
export class CustomercarebotController {
  constructor(private readonly customercarebotService: CustomercarebotService) {}
 @Post('/customer-care')
 async airline(@Body('prompt') prompt:string){
  return this.customercarebotService.startSimulation(prompt);
 }

}
