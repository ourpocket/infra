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
import { EmailRequestDto } from './dto/email-request.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { MESSAGES } from '../constant';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a developer account',
    description:
      'Creates a developer account for local or Google authentication. Local registrations require password, country, and accepted terms.',
  })
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
  @ApiResponse({ status: 201, description: 'Account registered' })
  @ApiResponse({ status: 400, description: 'Invalid registration payload' })
  @ResponseMessage(MESSAGES.SUCCESS.USER_REGISTERED)
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.createAccount(createAccountDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login to the dashboard',
    description:
      'Authenticates a developer account and returns an access token for dashboard APIs.',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ResponseMessage(MESSAGES.SUCCESS.LOGIN_SUCCESSFUL)
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.login(signInDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Validates the email verification token sent to the account.',
  })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ResponseMessage(MESSAGES.SUCCESS.EMAIL_VERIFIED)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Sets a new password using a valid password reset token.',
  })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ResponseMessage(MESSAGES.SUCCESS.PASSWORD_RESET)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(resetPasswordDto);
  }

  @Post('forgotten-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset token to the account email.',
  })
  @ApiResponse({ status: 200, description: 'Password reset link sent' })
  forgottenPassword(@Body() dto: EmailRequestDto): Promise<void> {
    return this.authService.forgottenPassword(dto.email);
  }

  @Post('request-verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request email verification',
    description: 'Sends a fresh email verification token to the account email.',
  })
  @ApiResponse({ status: 200, description: 'Verification email requested' })
  requestVerificationEmail(@Body() dto: EmailRequestDto): Promise<void> {
    return this.authService.requestVerificationEmail(dto.email);
  }
}
