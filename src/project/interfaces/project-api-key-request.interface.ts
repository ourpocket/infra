import { Request } from 'express';
import { ProjectApiKey } from '../../entities/project-api-key.entity';

export interface ProjectApiKeyRequest extends Request {
  projectApiKey?: ProjectApiKey;
}
