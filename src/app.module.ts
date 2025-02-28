import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AirlineModule } from './airline/airline.module';
import { CustomercarebotModule } from './customercarebot/customercarebot.module';

@Module({
  imports: [AirlineModule, CustomercarebotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
