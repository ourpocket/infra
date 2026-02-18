import { UserProviderResponseDto } from '../../src/user-provider/dto/user-provider-response.dto';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('UserProviderResponseDto', () => {
  const baseEntity = {
    id: 'provider-1',
    type: PROVIDER_TYPE_ENUM.PAYSTACK,
    name: 'Paystack',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  } as const;

  it('should map fields from entity and sanitize config values', () => {
    const entity: any = {
      ...baseEntity,
      config: {
        shortSecret: 'abcd',
        longSecret: 'secret123',
        numeric: 42,
        bool: false,
        object: { nested: 'value' },
        nullValue: null,
      },
    };

    const dto = UserProviderResponseDto.fromEntity(entity);

    expect(dto.id).toBe(baseEntity.id);
    expect(dto.type).toBe(baseEntity.type);
    expect(dto.name).toBe(baseEntity.name);
    expect(dto.isActive).toBe(true);
    expect(dto.createdAt).toEqual(baseEntity.createdAt);
    expect(dto.updatedAt).toEqual(baseEntity.updatedAt);

    expect(dto.config).not.toBeNull();
    expect(dto.config?.shortSecret).toBe('****');
    expect(dto.config?.longSecret).toBe('se***23');
    expect(dto.config?.numeric).toBe(42);
    expect(dto.config?.bool).toBe(false);
    expect(dto.config?.object).toBeNull();
    expect(dto.config?.nullValue).toBeNull();
  });

  it('should return null config when entity config is null', () => {
    const entity: any = {
      ...baseEntity,
      config: null,
    };

    const dto = UserProviderResponseDto.fromEntity(entity);

    expect(dto.config).toBeNull();
  });

  it('should map multiple entities with fromEntities', () => {
    const entities: any[] = [
      {
        ...baseEntity,
        id: 'provider-1',
        config: { secret: 'abcd' },
      },
      {
        ...baseEntity,
        id: 'provider-2',
        config: { secret: 'efgh' },
      },
    ];

    const dtos = UserProviderResponseDto.fromEntities(entities);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('provider-1');
    expect(dtos[1].id).toBe('provider-2');
    expect(dtos[0].config?.secret).toBe('****');
    expect(dtos[1].config?.secret).toBe('****');
  });
});
