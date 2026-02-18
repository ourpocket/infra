import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import {
  CreateAccountDto,
  CreateAccountLocalDto,
} from '../../src/auth/dto/create-account.dto';
import { SignInDto } from '../../src/auth/dto/sign-in.dto';
import { VerifyEmailDto } from '../../src/auth/dto/verify-email.dto';
import { ResetPasswordDto } from '../../src/auth/dto/reset-password.dto';
import { AUTH_TYPE_ENUM } from '../../src/enums';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      createAccount: jest.fn(),
      login: jest.fn(),
      verifyEmail: jest.fn(),
      resetPassword: jest.fn(),
      forgottenPassword: jest.fn(),
      requestVerificationEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAccount', () => {
    it('should call authService.createAccount', async () => {
      const dto: CreateAccountDto = {
        email: 'test@example.com',
        name: 'Test',
        acceptTerms: true,
        provider: AUTH_TYPE_ENUM.LOCAL,
        password: 'password',
      };
      authService.createAccount.mockResolvedValue({ id: 'user' });
      await controller.createAccount(dto);
      expect(authService.createAccount).toHaveBeenCalledWith(dto);
    });
  });

  describe('signIn', () => {
    it('should call authService.login', async () => {
      const dto: SignInDto = {
        email: 'test@example.com',
        password: 'password',
      };
      authService.login.mockResolvedValue({ accessToken: 'token' });
      await controller.signIn(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail', async () => {
      const dto: VerifyEmailDto = {
        email: 'test@example.com',
        token: 'token',
      };
      await controller.verifyEmail(dto);
      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const dto: ResetPasswordDto = {
        email: 'test@example.com',
        token: 'token',
        newPassword: 'NewPassword123',
      };
      await controller.resetPassword(dto);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('forgottenPassword', () => {
    it('should call authService.forgottenPassword', async () => {
      const email = 'test@example.com';
      await controller.forgottenPassword(email);
      expect(authService.forgottenPassword).toHaveBeenCalledWith(email);
    });
  });

  describe('requestVerificationEmail', () => {
    it('should call authService.requestVerificationEmail', async () => {
      const email = 'test@example.com';
      await controller.requestVerificationEmail(email);
      expect(authService.requestVerificationEmail).toHaveBeenCalledWith(email);
    });
  });
});
