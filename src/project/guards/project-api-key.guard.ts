import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectApiKeyService } from '../project-api-key.service';
import { ProjectApiKeyRequest } from '../interfaces/project-api-key-request.interface';

@Injectable()
export class ProjectApiKeyGuard implements CanActivate {
  constructor(private readonly projectApiKeyService: ProjectApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectApiKeyRequest>();
    const incomingKey = this.resolveApiKey(request);

    request.projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingKey);

    return true;
  }

  private resolveApiKey(request: ProjectApiKeyRequest): string {
    const apiKeyHeader = request.headers['x-api-key'];
    const authorizationHeader = request.headers.authorization;

    if (authorizationHeader?.startsWith('Bearer ')) {
      const bearerKey = authorizationHeader.slice(7).trim();
      if (bearerKey) {
        return bearerKey;
      }
    }

    if (typeof apiKeyHeader === 'string') {
      const key = apiKeyHeader.trim();
      if (key) {
        return key;
      }
    }

    if (Array.isArray(apiKeyHeader) && apiKeyHeader.length > 0) {
      const key = apiKeyHeader[0].trim();
      if (key) {
        return key;
      }
    }

    throw new UnauthorizedException('API key is required');
  }
}
