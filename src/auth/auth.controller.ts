import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CreateAccountDto,
  CreateAccountLocalDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiExtraModels(CreateAccountLocalDto, CreateAccountGoogleDto)
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateAccountLocalDto) },
        { $ref: getSchemaPath(CreateAccountGoogleDto) },
      ],
      discriminator: {
        propertyName: 'provider',
        mapping: {
          local: getSchemaPath(CreateAccountLocalDto),
          google: getSchemaPath(CreateAccountGoogleDto),
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ResponseMessage('User successfully registered')
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.createAccount(createAccountDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('User successfully logged in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.login(signInDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ResponseMessage('Email successfully verified')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ResponseMessage('Password successfully reset')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(resetPasswordDto);
  }
}
