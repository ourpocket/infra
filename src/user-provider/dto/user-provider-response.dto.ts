import { ApiProperty } from '@nestjs/swagger';
import { UserProvider } from '../../entities/user-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class UserProviderResponseDto {
  @ApiProperty({
    description: 'User provider id',
    example: '34c061c2-82e8-4f28-96f4-fbb350e82f70',
  })
  id!: string;

  @ApiProperty({
    description: 'Provider rail',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  type!: PROVIDER_TYPE_ENUM;

  @ApiProperty({
    description: 'Display name',
    example: 'Paystack production',
  })
  name!: string;

  @ApiProperty({
    description: 'Sanitized provider configuration',
    example: { apiKey: 'sk***es', businessId: 'bu***45' },
    nullable: true,
  })
  config!: Record<string, any> | null;

  @ApiProperty({
    description: 'Whether this provider is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-06-25T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-06-25T00:00:00.000Z',
  })
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
