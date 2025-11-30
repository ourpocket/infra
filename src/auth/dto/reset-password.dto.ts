import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password reset token sent to user',
    example: 'resetToken123',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewStrongPassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
