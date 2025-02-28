import { Test, TestingModule } from '@nestjs/testing';
import { CustomercarebotController } from './customercarebot.controller';
import { CustomercarebotService } from './customercarebot.service';

describe('CustomercarebotController', () => {
  let controller: CustomercarebotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomercarebotController],
      providers: [CustomercarebotService],
    }).compile();

    controller = module.get<CustomercarebotController>(CustomercarebotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
