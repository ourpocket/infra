import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailRequestDto {
  @ApiProperty({
    description: 'Account email address',
    example: 'sudo.whoami@example.com',
  })
  @IsEmail()
  email!: string;
}
