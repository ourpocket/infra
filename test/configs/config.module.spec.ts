import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../src/configs/config.module';

describe('ConfigModule', () => {
  it('should compile the configuration module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
