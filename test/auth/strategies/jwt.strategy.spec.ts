import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { UserService } from '../../../src/user/user.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: UserService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user payload', async () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890,
    };

    const user = {
      id: 'user-id',
      email: 'test@example.com',
      acceptTerms: true,
    };

    jest.spyOn(userService, 'findById').mockResolvedValue(user as any);

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      userId: 'user-id',
      email: 'test@example.com',
    });
  });

  it('should throw UnauthorizedException if user not found', async () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890,
    };

    jest.spyOn(userService, 'findById').mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if user has not accepted terms', async () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890,
    };

    const user = {
      id: 'user-id',
      email: 'test@example.com',
      acceptTerms: false,
    };

    jest.spyOn(userService, 'findById').mockResolvedValue(user as any);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
