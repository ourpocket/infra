import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAccount } from '../entities/platform-account.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { CreatePlatformAccountDto } from './dto/create-platform-account.dto';

@Injectable()
export class PlatformAccountService {
  constructor(
    @InjectRepository(PlatformAccount)
    private readonly platformAccountRepository: Repository<PlatformAccount>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createPlatformAccount(
    userId: string,
    dto: CreatePlatformAccountDto,
  ): Promise<PlatformAccount> {
    const existing = await this.platformAccountRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (existing) {
      throw new ConflictException('Platform account already exists for user');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    const platformAccount = await this.platformAccountRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    return platformAccount;
  }

  async listProjectsForUser(userId: string): Promise<Project[]> {
    const platformAccount = await this.platformAccountRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    const projects = await this.projectRepository.find({
      where: { platformAccount: { id: platformAccount.id } },
      order: { createdAt: 'DESC' },
    });

    return projects;
  }
}
