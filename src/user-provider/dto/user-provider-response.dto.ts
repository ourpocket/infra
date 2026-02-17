import { UserProvider } from '../../entities/user-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class UserProviderResponseDto {
  id!: string;
  type!: PROVIDER_TYPE_ENUM;
  name!: string;
  config!: Record<string, any> | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: UserProvider): UserProviderResponseDto {
    const response = new UserProviderResponseDto();
    response.id = entity.id;
    response.type = entity.type;
    response.name = entity.name;
    response.config = UserProviderResponseDto.sanitizeConfig(entity.config);
    response.isActive = entity.isActive;
    response.createdAt = entity.createdAt;
    response.updatedAt = entity.updatedAt;
    return response;
  }

  static fromEntities(entities: UserProvider[]): UserProviderResponseDto[] {
    return entities.map((entity) => UserProviderResponseDto.fromEntity(entity));
  }

  private static sanitizeConfig(
    config: Record<string, any> | null | undefined,
  ): Record<string, any> | null {
    if (!config) {
      return null;
    }

    const sanitized: Record<string, any> = {};

    for (const key of Object.keys(config)) {
      const value = config[key];

      if (typeof value === 'string') {
        const length = value.length;
        if (length <= 4) {
          sanitized[key] = '*'.repeat(length);
        } else {
          sanitized[key] = `${value.slice(0, 2)}***${value.slice(-2)}`;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = null;
      }
    }

    return sanitized;
  }
}
