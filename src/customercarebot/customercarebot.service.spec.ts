import { Test, TestingModule } from '@nestjs/testing';
import { CustomercarebotService } from './customercarebot.service';

describe('CustomercarebotService', () => {
  let service: CustomercarebotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomercarebotService],
    }).compile();

    service = module.get<CustomercarebotService>(CustomercarebotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
