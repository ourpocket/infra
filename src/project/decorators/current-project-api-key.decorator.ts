import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ProjectApiKey } from '../../entities/project-api-key.entity';
import { ProjectApiKeyRequest } from '../interfaces/project-api-key-request.interface';

export const CurrentProjectApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProjectApiKey => {
    const request = ctx.switchToHttp().getRequest<ProjectApiKeyRequest>();
    const projectApiKey = request.projectApiKey;

    if (!projectApiKey) {
      throw new Error('Project API key not found in request');
    }

    return projectApiKey;
  },
);
