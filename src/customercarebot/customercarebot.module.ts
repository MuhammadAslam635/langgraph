import { Module } from '@nestjs/common';
import { CustomercarebotService } from './customercarebot.service';
import { CustomercarebotController } from './customercarebot.controller';

@Module({
  controllers: [CustomercarebotController],
  providers: [CustomercarebotService],
})
export class CustomercarebotModule {}
