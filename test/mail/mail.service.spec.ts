import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../../src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

// Mock Resend
const mockSend = jest.fn();
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: mockSend,
        },
      };
    }),
  };
});

describe('MailService', () => {
  let service: MailService;
  let configService: any;

  beforeEach(async () => {
    mockSend.mockReset();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'RESEND_API_KEY') return 'mock-api-key';
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully with html', async () => {
      const params = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      };
      mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      const result = await service.sendEmail(params);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'OurPocket <no-reply@ourpocket.xyz>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      expect(result).toEqual({ id: 'email-id' });
    });

    it('should send email successfully with text', async () => {
      const params = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Hello',
      };
      mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      const result = await service.sendEmail(params);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'OurPocket <no-reply@ourpocket.xyz>',
        to: params.to,
        subject: params.subject,
        text: params.text,
      });
      expect(result).toEqual({ id: 'email-id' });
    });

    it('should throw Error if neither html nor text provided', async () => {
      const params = {
        to: 'test@example.com',
        subject: 'Test Subject',
      };

      await expect(service.sendEmail(params)).rejects.toThrow(
        'Either html or text must be provided',
      );
    });

    it('should throw InternalServerErrorException if resend returns error', async () => {
      const params = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      };
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Resend Error' },
      });

      await expect(service.sendEmail(params)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
      await service.sendWelcomeEmail('test@example.com', 'John');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to OurPocket!',
        }),
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
      await service.sendVerificationEmail('test@example.com', 'token-123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Verify Your Email',
          html: expect.stringContaining('token=token-123'),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
      await service.sendPasswordResetEmail('test@example.com', 'token-456');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Reset Your Password',
          html: expect.stringContaining('token=token-456'),
        }),
      );
    });
  });
});
