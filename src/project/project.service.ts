import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { PlatformAccount } from '../entities/platform-account.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PlatformAccount)
    private readonly platformAccountRepository: Repository<PlatformAccount>,
  ) {}

  async createProject(userId: string, dto: CreateProjectDto): Promise<Project> {
    const platformAccount = await this.platformAccountRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    const slug = dto.slug ?? this.slugify(dto.name);

    const existing = await this.projectRepository.findOne({
      where: { platformAccount: { id: platformAccount.id }, slug },
    });

    if (existing) {
      throw new ConflictException('Project with this slug already exists');
    }

    const project = this.projectRepository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      metadata: dto.metadata ?? null,
      platformAccount,
    });

    return this.projectRepository.save(project);
  }

  async listProjectsForUser(userId: string): Promise<Project[]> {
    const platformAccount = await this.platformAccountRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    return this.projectRepository.find({
      where: { platformAccount: { id: platformAccount.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async getProjectForUser(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        platformAccount: { user: { id: userId } },
      },
      relations: ['platformAccount'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
