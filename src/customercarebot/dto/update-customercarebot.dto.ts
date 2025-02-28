import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomercarebotDto } from './create-customercarebot.dto';

export class UpdateCustomercarebotDto extends PartialType(CreateCustomercarebotDto) {}
