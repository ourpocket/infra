import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  PROVIDER_CATALOG_STATUS_ENUM,
  PROVIDER_CATEGORY_ENUM,
  PROVIDER_TYPE_ENUM,
} from '../../src/enums';
import { ProviderCatalogService } from '../../src/provider-catalog/provider-catalog.service';
import { ProviderCatalogRepository } from '../../src/provider-catalog/provider-catalog.repository';
import { RoutingEngineService } from '../../src/routing/routing-engine.service';

describe('ProviderCatalogService', () => {
  let service: ProviderCatalogService;
  let providerCatalogRepository: any;
  let routingEngineService: any;

  beforeEach(async () => {
    providerCatalogRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findPublicCatalog: jest.fn(),
      save: jest.fn(),
    };
    routingEngineService = {
      listSupportedProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderCatalogService,
        {
          provide: ProviderCatalogRepository,
          useValue: providerCatalogRepository,
        },
        {
          provide: RoutingEngineService,
          useValue: routingEngineService,
        },
      ],
    }).compile();

    service = module.get<ProviderCatalogService>(ProviderCatalogService);
  });

  it('creates an active catalog entry only when its adapter is registered', async () => {
    const dto = {
      slug: 'paystack',
      name: 'Paystack',
      description: 'Collect and move money across Africa.',
      logoAsset: '/img/paystack_logo.svg',
      category: PROVIDER_CATEGORY_ENUM.AFRICA,
      capabilities: [],
      credentialFields: [],
      adapterType: PROVIDER_TYPE_ENUM.PAYSTACK,
      status: PROVIDER_CATALOG_STATUS_ENUM.ACTIVE,
      sortOrder: 1,
    };
    const provider = { id: 'provider-id', ...dto };

    providerCatalogRepository.findOne.mockResolvedValue(null);
    providerCatalogRepository.create.mockReturnValue(provider);
    providerCatalogRepository.save.mockResolvedValue(provider);
    routingEngineService.listSupportedProviders.mockReturnValue([
      PROVIDER_TYPE_ENUM.PAYSTACK,
    ]);

    await expect(service.create(dto)).resolves.toEqual(provider);
  });

  it('rejects an active entry without a registered adapter', async () => {
    providerCatalogRepository.findOne.mockResolvedValue(null);
    routingEngineService.listSupportedProviders.mockReturnValue([]);

    await expect(
      service.create({
        slug: 'stripe',
        name: 'Stripe',
        description: 'Global payments.',
        logoAsset: '/img/provider-placeholder.svg',
        category: PROVIDER_CATEGORY_ENUM.GLOBAL,
        capabilities: [],
        credentialFields: [],
        status: PROVIDER_CATALOG_STATUS_ENUM.ACTIVE,
        sortOrder: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not allow a coming-soon provider to be connected', async () => {
    providerCatalogRepository.findOne.mockResolvedValue({
      id: 'provider-id',
      status: PROVIDER_CATALOG_STATUS_ENUM.COMING_SOON,
      adapterType: null,
    });

    await expect(service.findConnectable('provider-id')).rejects.toThrow(
      BadRequestException,
    );
  });
});
