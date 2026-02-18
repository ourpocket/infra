import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { UserRepository } from '../../src/user/user.repository';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../src/mail/mail.service';
import { AUTH_TYPE_ENUM } from '../../src/enums';
import { MESSAGES } from '../../src/constant';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../src/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let mailService: any;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    mailService = {
      sendWelcomeEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      acceptTerms: true,
      provider: AUTH_TYPE_ENUM.LOCAL,
    };

    it('should throw error if terms not accepted', async () => {
      await expect(
        service.createAccount({ ...createAccountDto, acceptTerms: false }),
      ).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.TERMS_NOT_ACCEPTED),
      );
    });

    it('should throw error if password missing for local provider', async () => {
      await expect(
        service.createAccount({ ...createAccountDto, password: '' }),
      ).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.PASSWORD_REQUIRED),
      );
    });

    it('should throw error if email already in use', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.createAccount(createAccountDto)).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.EMAIL_ALREADY_IN_USE),
      );
    });

    it('should create user for local provider', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const hashedPassword = 'hashedPassword';
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(hashedPassword) as any);
      userRepository.create.mockImplementation((dto) => dto);
      userRepository.save.mockResolvedValue({
        id: 'new-user',
        ...createAccountDto,
        passwordHash: hashedPassword,
      });

      const result = await service.createAccount(createAccountDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        createAccountDto.email.toLowerCase(),
      );
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        createAccountDto.email,
        createAccountDto.name,
      );
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should create user for external provider', async () => {
      const googleDto = {
        email: 'google@example.com',
        name: 'Google User',
        acceptTerms: true,
        provider: AUTH_TYPE_ENUM.GOOGLE,
      };
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockImplementation((dto) => dto);
      userRepository.save.mockResolvedValue({
        id: 'google-user',
        ...googleDto,
      });

      const result = await service.createAccount(googleDto);

      expect(userRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(googleDto.email.toLowerCase());
    });

    it('should return existing user for external provider', async () => {
      const googleDto = {
        email: 'google@example.com',
        name: 'Google User',
        acceptTerms: true,
        provider: AUTH_TYPE_ENUM.GOOGLE,
      };
      const existingUser = { id: 'existing-google', ...googleDto };
      userRepository.findByEmail.mockResolvedValue(existingUser);
      userRepository.save.mockResolvedValue(existingUser);

      const result = await service.createAccount(googleDto);
      expect(result).toEqual(existingUser);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password' };

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(MESSAGES.ERROR.INVALID_CREDENTIALS),
      );
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        provider: AUTH_TYPE_ENUM.LOCAL,
        role: 'user',
        status: 'active',
      } as any;
      userRepository.findByEmail.mockResolvedValue(user);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false) as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(MESSAGES.ERROR.INVALID_CREDENTIALS),
      );
    });

    it('should return token if login successful', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'user',
        provider: AUTH_TYPE_ENUM.LOCAL,
        status: 'active',
      } as any;
      userRepository.findByEmail.mockResolvedValue(user);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true) as any);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);
      expect(result).toEqual({
        token: 'token',
        role: user.role,
        status: user.status,
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if token invalid', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(
        service.verifyEmail({
          email: 'test@example.com',
          token: 'invalid',
        }),
      ).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED),
      );
    });

    it('should throw BadRequestException if token expired', async () => {
      userRepository.findOne.mockResolvedValue({
        emailVerificationExpires: new Date(Date.now() - 1000),
      });
      await expect(
        service.verifyEmail({
          email: 'test@example.com',
          token: 'expired',
        }),
      ).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED),
      );
    });

    it('should verify email', async () => {
      const user = {
        emailVerificationExpires: new Date(Date.now() + 10000),
        save: jest.fn(),
      };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.verifyEmail({
        email: 'test@example.com',
        token: 'valid',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        }),
      );
    });
  });

  describe('requestVerificationEmail', () => {
    it('should throw BadRequestException if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(
        service.requestVerificationEmail('test@example.com'),
      ).rejects.toThrow(
        new BadRequestException(MESSAGES.AUTHENTICATION.NO_USER),
      );
    });

    it('should send verification email', async () => {
      const user = { email: 'test@example.com', name: 'Test' };
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.requestVerificationEmail('test@example.com');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        }),
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('forgottenPassword', () => {
    it('should do nothing if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgottenPassword('test@example.com'),
      ).resolves.toBeUndefined();

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should persist reset token and expiry when user exists', async () => {
      const user = { email: 'test@example.com', name: 'Test' };
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.forgottenPassword('test@example.com');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      );
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetDto = {
      email: 'test@example.com',
      token: 'token',
      newPassword: 'NewPassword123',
    };

    it('should throw BadRequestException if token invalid', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED),
      );
    });

    it('should throw BadRequestException if token expired', async () => {
      userRepository.findOne.mockResolvedValue({
        passwordResetExpires: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED),
      );
    });

    it('should reset password', async () => {
      const user = { passwordResetExpires: new Date(Date.now() + 10000) };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('newHash') as any);

      await service.resetPassword(resetDto);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'newHash',
          passwordResetToken: null,
          passwordResetExpires: null,
        }),
      );
    });
  });
});
