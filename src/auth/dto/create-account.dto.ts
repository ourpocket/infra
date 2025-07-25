import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
    @ApiProperty({
        description: 'Full name of the user or developer',
        example: 'Jane Doe',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Valid email address of the user',
        example: 'jane.doe@example.com',
    })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({
        description: 'URL to profile photo',
        example: 'https://example.com/avatar.jpg',
    })
    @IsOptional()
    @IsUrl()
    photoUrl?: string;

    @ApiPropertyOptional({
        description: 'Auth provider used to create account',
        enum: ['google', 'github', 'local'],
        example: 'google',
    })
    @IsOptional()
    @IsString()
    provider?: 'google' | 'github' | 'local';

    @ApiPropertyOptional({
        description: 'Password (only required for local provider)',
        example: 'securePassword123!',
    })
    @IsOptional()
    @IsString()
    password?: string;
}
