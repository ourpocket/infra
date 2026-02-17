import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend, type CreateEmailOptions } from 'resend';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing');
    }

    this.resend = new Resend(apiKey);
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
    from = 'OurPocket <no-reply@ourpocket.xyz>',
  }: SendEmailParams) {
    let emailOptions: CreateEmailOptions;

    if (html) {
      emailOptions = {
        from,
        to,
        subject,
        html,
      };
    } else if (text) {
      emailOptions = {
        from,
        to,
        subject,
        text,
      };
    } else {
      throw new Error('Either html or text must be provided');
    }

    const { data, error } = await this.resend.emails.send(emailOptions);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async sendWelcomeEmail(to: string, name: string) {
    const htmlContent = `
      <p>Hi ${name},</p>
      <p>Thank you for signing up to OurPocket.</p>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to OurPocket!',
      html: htmlContent,
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const htmlContent = `
      <p>Hi,</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    return this.sendEmail({
      to,
      subject: 'Verify Your Email',
      html: htmlContent,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const htmlContent = `
      <p>Hi,</p>
      <p>You can reset your password by clicking the link below:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      html: htmlContent,
    });
  }
}
