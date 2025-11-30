import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateAccountDto } from './dto/create-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AUTH_TYPE_ENUM } from '../enums';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { FRONTEND_URL, MESSAGES } from '../constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createAccount(
    dto: CreateAccountDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const provider = dto.provider ?? AUTH_TYPE_ENUM.LOCAL;

    if (!dto.acceptTerms) {
      throw new BadRequestException(MESSAGES.ERROR.TERMS_NOT_ACCEPTED);
    }

    if (provider === AUTH_TYPE_ENUM.LOCAL) {
      return this.handleLocalSignup(dto);
    }

    return this.handleProviderSignup(dto, provider);
  }

  private async handleLocalSignup(
    dto: CreateAccountDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const { email, password, name, photoUrl, companyName, role } = dto;

    if (!password) {
      throw new BadRequestException(MESSAGES.ERROR.PASSWORD_REQUIRED);
    }

    const existing = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException(MESSAGES.ERROR.EMAIL_ALREADY_IN_USE);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = this.userRepo.create({
      name,
      email: email.toLowerCase(),
      photoUrl: photoUrl ?? null,
      companyName: companyName ?? null,
      role: role ?? null,
      provider: AUTH_TYPE_ENUM.LOCAL,
      passwordHash,
      acceptTerms: !!dto.acceptTerms,
      isEmailVerified: false,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  private async handleProviderSignup(
    dto: CreateAccountDto,
    provider: AUTH_TYPE_ENUM,
  ): Promise<Omit<User, 'passwordHash'>> {
    const { email, name, photoUrl, companyName, role } = dto;
    const lowerEmail = email.toLowerCase();
    let user = await this.userRepo.findOne({ where: { email: lowerEmail } });

    if (!user) {
      user = this.userRepo.create({
        name,
        email: lowerEmail,
        photoUrl: photoUrl ?? null,
        companyName: companyName ?? null,
        role: role ?? null,
        provider,
        passwordHash: null,
        acceptTerms: !!dto.acceptTerms,
        isEmailVerified: true,
      });
    } else {
      user.name = name;
      user.photoUrl = photoUrl ?? user.photoUrl ?? null;
      user.companyName = companyName ?? user.companyName ?? null;
      user.role = role ?? user.role ?? null;
      user.provider = provider;
      user.acceptTerms = !!dto.acceptTerms;
    }

    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  async login(signInDto: SignInDto): Promise<{ token: string }> {
    const { email, password } = signInDto;

    const user = await this.userRepo.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      throw new UnauthorizedException(MESSAGES.ERROR.INVALID_CREDENTIALS);
    }

    if (user.provider !== AUTH_TYPE_ENUM.LOCAL) {
      throw new BadRequestException(
        MESSAGES.ERROR.WRONG_PROVIDER(user.provider),
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(MESSAGES.ERROR.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException(MESSAGES.ERROR.INVALID_CREDENTIALS);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    try {
      const token = await this.jwtService.signAsync(payload);
      return {
        token,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sign JWT for user ${user.id}: ${error as any}`,
      );
      throw new InternalServerErrorException(MESSAGES.ERROR.LOGIN_FAILED);
    }
  }

  async forgottenPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = addMinutes(new Date(), 10);

    user.passwordResetToken = token;
    user.passwordResetExpires = expiresAt;

    await this.userRepo.save(user);

    const resetPasswordLink = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    console.log(`Reset link for ${email}: ${resetPasswordLink}`);

    //TODO: Send email to user.
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const { email, token } = verifyEmailDto;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepo.findOne({
      where: {
        email: email.toLowerCase(),
        emailVerificationToken: hashedToken,
      },
    });

    if (!user) {
      throw new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED);
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await this.userRepo.save(user);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { email, token, newPassword } = resetPasswordDto;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepo.findOne({
      where: {
        email: email.toLowerCase(),
        passwordResetToken: hashedToken,
      },
    });

    if (!user) {
      throw new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED);
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException(MESSAGES.ERROR.TOKEN_INVALID_OR_EXPIRED);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.userRepo.save(user);
  }
}
