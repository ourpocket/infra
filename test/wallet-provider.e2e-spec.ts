import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as nock from 'nock';
import { WalletProviderController } from '../src/wallet-provider/wallet-provider.controller';
import { WalletProviderService } from '../src/wallet-provider/wallet-provider.service';
import { ProjectApiKeyService } from '../src/project/project-api-key.service';
import { ProjectProviderService } from '../src/project/project-provider.service';
import { LedgerService } from '../src/ledger/ledger.service';
import { WEB2_ENDPOINT_URL } from '../src/constant/web2-endpoints';

describe('WalletProvider (e2e)', () => {
  let app: INestApplication;
  let projectApiKeyService: any;
  let projectProviderService: any;
  let ledgerService: any;

  beforeEach(async () => {
    projectApiKeyService = {
      verifyProjectApiKey: jest.fn(),
    };
    projectProviderService = {
      getProviderApiKeyForProject: jest.fn(),
    };
    ledgerService = {
      executeTransaction: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WalletProviderController],
      providers: [
        WalletProviderService,
        {
          provide: ProjectApiKeyService,
          useValue: projectApiKeyService,
        },
        {
          provide: ProjectProviderService,
          useValue: projectProviderService,
        },
        {
          provide: LedgerService,
          useValue: ledgerService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/wallet-providers/actions (POST) - Create Wallet', async () => {
    const mockApiKey = 'sk_test_123';
    const mockProviderKey = 'pk_test_paystack';
    const mockPayload = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '+2348012345678',
    };

    projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
      project: { id: 'project-123' },
    });
    projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
      mockProviderKey,
    );

    // Mock Paystack API
    nock('https://api.paystack.co')
      .post('/customer', mockPayload)
      .reply(200, {
        status: true,
        message: 'Customer created',
        data: {
          id: 123,
          customer_code: 'CUS_12345',
        },
      });

    const response = await request(app.getHttpServer())
      .post('/wallet-providers/actions')
      .set('x-api-key', mockApiKey)
      .send({
        provider: 'paystack',
        action: 'create_wallet',
        payload: mockPayload,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: true,
      message: 'Customer created',
      data: {
        id: 123,
        customer_code: 'CUS_12345',
      },
    });

    expect(projectApiKeyService.verifyProjectApiKey).toHaveBeenCalledWith(
      mockApiKey,
    );
    expect(
      projectProviderService.getProviderApiKeyForProject,
    ).toHaveBeenCalledWith('project-123', 'paystack');
  });

  it('/wallet-providers/actions (POST) - Deposit (with Ledger)', async () => {
    const mockApiKey = 'sk_test_123';
    const mockProviderKey = 'pk_test_paystack';
    const mockPayload = {
      amount: 5000,
      email: 'test@example.com',
      ledger: {
        amount: 5000,
        currency: 'NGN',
        description: 'Deposit',
      },
    };

    projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
      project: { id: 'project-123' },
    });
    projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
      mockProviderKey,
    );
    ledgerService.executeTransaction.mockResolvedValue({
      id: 'tx_123',
      status: 'success',
    });

    // Mock Paystack API
    nock('https://api.paystack.co')
      .post('/transaction/initialize', {
        amount: 5000,
        email: 'test@example.com',
      })
      .reply(200, {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/access_code',
          access_code: 'access_code',
          reference: 'reference',
        },
      });

    const response = await request(app.getHttpServer())
      .post('/wallet-providers/actions')
      .set('x-api-key', mockApiKey)
      .send({
        provider: 'paystack',
        action: 'deposit',
        payload: mockPayload,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      provider: {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/access_code',
          access_code: 'access_code',
          reference: 'reference',
        },
      },
      ledger: {
        id: 'tx_123',
        status: 'success',
      },
    });

    expect(ledgerService.executeTransaction).toHaveBeenCalledWith(
      mockPayload.ledger,
    );
  });
});
