import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformAccount } from '../entities/platform-account.entity';
import { Project } from '../entities/project.entity';
import { CreatePlatformAccountDto } from './dto/create-platform-account.dto';
import { PlatformAccountRepository } from './platform-account.repository';
import { ProjectRepository } from '../project/project.repository';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class PlatformAccountService {
  constructor(
    private readonly platformAccountRepository: PlatformAccountRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createPlatformAccount(
    userId: string,
    dto: CreatePlatformAccountDto,
  ): Promise<PlatformAccount> {
    const existing = await this.platformAccountRepository.findByUserId(userId);

    if (existing) {
      throw new ConflictException('Platform account already exists for user');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const platformAccount = this.platformAccountRepository.create({
      user,
      name: dto.name,
      companyName: dto.companyName ?? null,
      metadata: dto.metadata ?? null,
    });

    return this.platformAccountRepository.save(platformAccount);
  }

  async getPlatformAccountForUser(userId: string): Promise<PlatformAccount> {
    const platformAccount =
      await this.platformAccountRepository.findByUserId(userId);

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    return platformAccount;
  }

  async listProjectsForUser(userId: string): Promise<Project[]> {
    const platformAccount =
      await this.platformAccountRepository.findByUserId(userId);

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    const projects = await this.projectRepository.findAllByPlatformAccountId(
      platformAccount.id,
    );

    return projects;
  }
}
