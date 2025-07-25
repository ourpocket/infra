import { Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import {VerifyEmailDto} from "./dto/verify-email.dto";
import {ResetPasswordDto} from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
  createAccount(createAuthDto: CreateAccountDto) {

  }

  signIn(signInDto: SignInDto) {

  }

  forgottenPassword() {

  }

  verifyEmail( verifyEmailDto: VerifyEmailDto) {

  }

  resetPassword( resetPasswordDto: ResetPasswordDto) {

  }
}
