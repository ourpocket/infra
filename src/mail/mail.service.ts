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
}
