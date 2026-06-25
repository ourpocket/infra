import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectRepository } from './project.repository';
import { PlatformAccountRepository } from '../platform-account/platform-account.repository';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly platformAccountRepository: PlatformAccountRepository,
  ) {}

  async createProject(userId: string, dto: CreateProjectDto): Promise<Project> {
    const platformAccount =
      await this.platformAccountRepository.findByUserId(userId);

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    const slug = await this.resolveProjectSlug(dto, platformAccount.id);

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
    const platformAccount =
      await this.platformAccountRepository.findByUserId(userId);

    if (!platformAccount) {
      throw new NotFoundException('Platform account not found');
    }

    return this.projectRepository.findAllByPlatformAccountId(
      platformAccount.id,
    );
  }

  async getProjectForUser(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

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

  private async resolveProjectSlug(
    dto: CreateProjectDto,
    platformAccountId: string,
  ): Promise<string> {
    const baseSlug = this.slugify(dto.slug ?? dto.name) || 'project';

    if (dto.slug) {
      const existing =
        await this.projectRepository.findBySlugAndPlatformAccountId(
          baseSlug,
          platformAccountId,
        );

      if (existing) {
        throw new ConflictException('Project with this slug already exists');
      }

      return baseSlug;
    }

    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.projectRepository.findBySlugAndPlatformAccountId(
        slug,
        platformAccountId,
      )
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }
}
