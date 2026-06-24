import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { Webhook } from '../entities/webhook.entity';
import { WEBHOOK_EVENT_ENUM } from '../enums';
import { ProjectRepository } from '../project/project.repository';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';
import { WebhookRepository } from './webhook.repository';

export interface NormalizedWebhookPayload {
  event: WEBHOOK_EVENT_ENUM;
  provider: string;
  amount?: number;
  currency?: string;
  reference?: string;
  providerReference?: string;
  projectId: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async createWebhook(
    userId: string,
    projectId: string,
    dto: CreateWebhookDto,
  ): Promise<Webhook> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const webhook = this.webhookRepository.create({
      project,
      url: dto.url,
      secret: this.generateWebhookSecret(),
      isActive: dto.isActive ?? true,
      eventTypes: dto.eventTypes ?? null,
    });

    return this.webhookRepository.save(webhook);
  }

  async listWebhooks(userId: string, projectId: string): Promise<Webhook[]> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.webhookRepository.findAllByProjectId(projectId);
  }

  async deleteWebhook(
    userId: string,
    projectId: string,
    webhookId: string,
  ): Promise<void> {
    const webhook = await this.webhookRepository.findByIdAndProjectIdAndUserId(
      webhookId,
      projectId,
      userId,
    );

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.webhookRepository.remove(webhook);
  }

  normalizeProviderWebhook(
    projectApiKey: ProjectApiKey,
    dto: ProviderWebhookDto,
  ): NormalizedWebhookPayload {
    return {
      event: dto.event ?? WEBHOOK_EVENT_ENUM.TRANSACTION_SUCCESS,
      provider: dto.provider,
      amount: dto.amount,
      currency: dto.currency?.toUpperCase(),
      reference: dto.reference,
      providerReference: dto.providerReference,
      projectId: projectApiKey.project.id,
      data: dto.data,
    };
  }

  private generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }
}
