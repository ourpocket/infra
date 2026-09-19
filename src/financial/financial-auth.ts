import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { ProjectApiKeyGuard } from '../project/guards/project-api-key.guard';
import { ProjectApiKeyRequest } from '../project/interfaces/project-api-key-request.interface';
import { ProjectRepository } from '../project/project.repository';
import { JwtUser } from '../auth/interfaces/jwt-payload.interface';
import { FinancialContext, keyContext } from './financial.service';
export interface FinancialRequest extends Request {
  financial: FinancialContext;
  user?: JwtUser;
}
export function requestId(request: Request): string {
  const header = request.headers['x-request-id'];
  return typeof header === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      header,
    )
    ? header
    : randomUUID();
}
@Injectable()
export class FinancialApiGuard implements CanActivate {
  constructor(private readonly apiGuard: ProjectApiKeyGuard) {}
  async canActivate(context: ExecutionContext) {
    await this.apiGuard.canActivate(context);
    const req = context
      .switchToHttp()
      .getRequest<ProjectApiKeyRequest & FinancialRequest>();
    if (!req.projectApiKey) throw new UnauthorizedException();
    req.financial = keyContext(req.projectApiKey, requestId(req));
    return true;
  }
}
@Injectable()
export class FinancialDashboardGuard implements CanActivate {
  constructor(private readonly projects: ProjectRepository) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<FinancialRequest>();
    const projectId = req.params.projectId;
    if (
      typeof projectId !== 'string' ||
      !req.user ||
      !(await this.projects.findByIdAndUserId(projectId, req.user.userId))
    )
      throw new UnauthorizedException('Project not accessible');
    const environment = req.headers['x-environment'] ?? 'sandbox';
    if (environment !== 'sandbox' && environment !== 'production')
      throw new BadRequestException('Invalid environment');
    req.financial = { projectId, environment, requestId: requestId(req) };
    return true;
  }
}
export const CurrentFinancialContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<FinancialRequest>().financial,
);
