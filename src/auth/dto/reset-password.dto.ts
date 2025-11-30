import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'User email',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password reset token sent to user',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
