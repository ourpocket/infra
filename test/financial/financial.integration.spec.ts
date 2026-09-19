import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Queue } from 'bullmq';
import * as destination from '../../src/financial/webhook-destination';
import { Webhook } from '../../src/entities/webhook.entity';
import { MailService } from '../../src/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { userInfo } from 'node:os';
import { randomUUID, createHmac } from 'node:crypto';
// nock publishes with `export =`; this form preserves its callable CommonJS API in Jest.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');
import { FinancialRetentionService } from '../../src/financial/financial-retention.service';
import { FinancialModule } from '../../src/financial/financial.module';
import { AuthModule } from '../../src/auth/auth.module';
import { User } from '../../src/entities/user.entity';
import { PlatformAccount } from '../../src/entities/platform-account.entity';
import { Project } from '../../src/entities/project.entity';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { ProjectService } from '../../src/project/project.service';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';
import {
  FinancialResource,
  FinancialEvent,
  FinancialLog,
  FinancialDelivery,
} from '../../src/financial/financial.entity';
import {
  FinancialService,
  FinancialContext,
} from '../../src/financial/financial.service';
import { FinancialWebhooksService } from '../../src/financial/financial-webhooks.service';
import { InitialSchema20260101000000 } from '../../src/migrations/20260101000000-InitialSchema';
import { ProviderCatalog20260918000000 } from '../../src/migrations/20260918000000-ProviderCatalog';
import { FinancialInfrastructure20260919000000 } from '../../src/migrations/20260919000000-FinancialInfrastructure';
import { FinancialControlPlane20260920000000 } from '../../src/migrations/20260920000000-FinancialControlPlane';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
const database = process.env.TEST_DATABASE_NAME;
const suite = database ? describe : describe.skip;
suite('Financial API with disposable PostgreSQL', () => {
  let app: INestApplication;
  let db: DataSource;
  let financial: FinancialService;
  let hooks: FinancialWebhooksService;
  let base: string;
  let projectId: string;
  let userId: string;
  let sandboxKey: string;
  let liveKey: string;
  let ctx: FinancialContext;
  let liveCtx: FinancialContext;
  let customer: FinancialResource;
  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:|$)/);
    process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = 'test-only-encryption-key';
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({ jwt: { secret: 'test-only-secret', expiresIn: '1d' } }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: '/tmp',
          username: userInfo().username,
          database,
          entities: [__dirname + '/../../src/**/*.entity.ts'],
          synchronize: false,
        }),
        ScheduleModule.forRoot(),
        FinancialModule,
        AuthModule,
      ],
    })
      .overrideProvider(MailService)
      .useValue({
        sendWelcomeEmail: jest.fn(),
        sendVerificationEmail: jest.fn(),
      })
      .compile();
    app = module.createNestApplication({ rawBody: true });
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    db = app.get(DataSource);
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await new InitialSchema20260101000000().up(runner);
    await new ProviderCatalog20260918000000().up(runner);
    const user = await db.manager.save(
      User,
      db.manager.create(User, {
        name: 'Sandbox developer',
        email: 'mvp@example.test',
        acceptTerms: true,
        isEmailVerified: true,
      }),
    );
    userId = user.id;
    const workspace = await db.manager.save(
      PlatformAccount,
      db.manager.create(PlatformAccount, { user, name: 'Test workspace' }),
    );
    const legacyProject = await db.manager.save(
      Project,
      db.manager.create(Project, {
        name: 'Legacy',
        slug: 'legacy',
        platformAccount: workspace,
      }),
    );
    await runner.query(
      `INSERT INTO project_providers(type,config,project_id) VALUES('paystack','{"apiKey":"legacy-key"}'::jsonb,$1)`,
      [legacyProject.id],
    );
    await new FinancialInfrastructure20260919000000().up(runner);
    await new FinancialControlPlane20260920000000().up(runner);
    const rows = await runner.query(
      `SELECT environment,config FROM project_providers WHERE project_id=$1`,
      [legacyProject.id],
    );
    expect(rows[0].environment).toBeNull();
    expect(rows[0].config.apiKey).toBe('legacy-key');
    await runner.release();
    const project = await app
      .get(ProjectService)
      .createProject(userId, { name: 'MVP project' });
    projectId = project.id;
    sandboxKey = project.sandboxKey;
    const live = await app
      .get(ProjectApiKeyService)
      .createProjectApiKey(userId, projectId, { scope: 'live' });
    liveKey = live.rawKey;
    ctx = { projectId, environment: 'sandbox', requestId: randomUUID() };
    liveCtx = { ...ctx, environment: 'production' };
    financial = app.get(FinancialService);
    hooks = app.get(FinancialWebhooksService);
    customer = await financial.customer(
      ctx,
      { email: 'customer@example.test' },
      'customer',
    );
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    base = `http://127.0.0.1:${address.port}/v1`;
  }, 30000);
  afterAll(async () => {
    jest.restoreAllMocks();
    nock.cleanAll();
    nock.enableNetConnect();
    await app?.close();
    delete process.env.FINANCIAL_WEBHOOK_WORKER;
  });
  it('creates the first sandbox operation without provider accounts and isolates environments', async () => {
    const request = { amount: '50000', currency: 'NGN', customer: customer.id };
    const response = await fetch(`${base}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sandboxKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'http-payment',
      },
      body: JSON.stringify(request),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.status).toBe('completed');
    expect(body.data.environment).toBe('sandbox');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    await expect(financial.resource(liveCtx, body.data.id)).rejects.toThrow(
      'Resource not found',
    );
    await expect(
      financial.resource({ ...ctx, projectId: randomUUID() }, body.data.id),
    ).rejects.toThrow('Resource not found');
  });
  it('deduplicates concurrent requests and rejects changed payloads', async () => {
    const dto = { amount: '1000', currency: 'NGN', customer: customer.id };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        financial.payment(ctx, dto, 'concurrent'),
      ),
    );
    expect(new Set(results.map((item) => item.id)).size).toBe(1);
    await expect(
      financial.payment(ctx, { ...dto, amount: '1001' }, 'concurrent'),
    ).rejects.toThrow('different request');
    await expect(financial.payment(ctx, dto)).rejects.toThrow(
      'Idempotency-Key',
    );
  });
  it('reserves concurrent refunds and never over-refunds', async () => {
    const payment = await financial.payment(
      ctx,
      { amount: '10000', currency: 'NGN', customer: customer.id },
      'refundable',
    );
    const results = await Promise.allSettled([
      financial.refund(
        ctx,
        { payment: payment.id, amount: '6000', scenario: 'pending' },
        'refund-a',
      ),
      financial.refund(
        ctx,
        { payment: payment.id, amount: '6000' },
        'refund-b',
      ),
    ]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    const pending = results.find((item) => item.status === 'fulfilled');
    if (!pending || pending.status !== 'fulfilled')
      throw new Error('Refund missing');
    await financial.simulate(ctx, pending.value.id, 'failed');
    const full = await financial.refund(
      ctx,
      { payment: payment.id },
      'refund-full',
    );
    expect(full.amount).toBe('10000');
  });
  it('updates sandbox balances atomically and resolves held transfers exactly once', async () => {
    const a = await financial.wallet(ctx, { currency: 'NGN' }, 'wallet-a');
    const b = await financial.wallet(ctx, { currency: 'NGN' }, 'wallet-b');
    await financial.walletOperation(
      ctx,
      'fund',
      { amount: '1000', currency: 'NGN' },
      'fund-a',
      undefined,
      a.id,
    );
    const transfers = await Promise.all([
      financial.transfer(
        ctx,
        { fromWallet: a.id, toWallet: b.id, amount: '700', currency: 'NGN' },
        'transfer-a',
      ),
      financial.transfer(
        ctx,
        { fromWallet: a.id, toWallet: b.id, amount: '700', currency: 'NGN' },
        'transfer-b',
      ),
    ]);
    expect(transfers.map((item) => item.status).sort()).toEqual([
      'completed',
      'failed',
    ]);
    const pending = await financial.transfer(
      ctx,
      {
        fromWallet: b.id,
        toWallet: a.id,
        amount: '200',
        currency: 'NGN',
        scenario: 'timeout',
      },
      'held',
    );
    expect((await financial.resource(ctx, b.id)).details.balance).toBe('500');
    await financial.simulate(ctx, pending.id, 'failed');
    await financial.simulate(ctx, pending.id, 'failed');
    expect((await financial.resource(ctx, b.id)).details.balance).toBe('700');
    await expect(
      financial.simulate(ctx, pending.id, 'completed'),
    ).rejects.toThrow('terminal');
    await expect(
      financial.wallet(liveCtx, { currency: 'NGN' }, 'live-wallet'),
    ).rejects.toThrow('Select Turnkey or Privy');
  });
  it('requires matching live connections and preserves pending checkout until verified', async () => {
    const connections = app.get(ProjectProviderService);
    await connections.configureProvider(
      userId,
      projectId,
      {
        type: PROVIDER_TYPE_ENUM.PAYSTACK,
        config: { apiKey: 'sk_live_fixture' },
      },
      'production',
    );
    const raw = await db.query(
      `SELECT config FROM project_providers WHERE project_id=$1 AND environment='production'`,
      [projectId],
    );
    expect(JSON.stringify(raw)).not.toContain('sk_live_fixture');
    const listed = await connections.listProvidersForProject(
      userId,
      projectId,
      'production',
    );
    expect(JSON.stringify(listed)).not.toContain('sk_live_fixture');
    const liveCustomer = await financial.customer(
      liveCtx,
      { email: 'live@example.test' },
      'live-customer',
    );
    nock('https://api.paystack.co')
      .post('/transaction/initialize')
      .reply(200, (_uri, body) => ({
        status: true,
        data: {
          reference: JSON.parse(JSON.stringify(body)).reference,
          authorization_url: 'https://checkout.paystack.com/fixture',
        },
      }));
    const payment = await financial.payment(
      liveCtx,
      { customer: liveCustomer.id, amount: '50000', currency: 'NGN' },
      'live-payment',
    );
    expect(payment.status).toBe('pending');
    nock('https://api.paystack.co')
      .get(`/transaction/verify/${payment.id}`)
      .reply(200, {
        status: true,
        data: {
          id: 123,
          reference: payment.id,
          amount: 49999,
          currency: 'NGN',
          status: 'success',
        },
      });
    await expect(financial.verify(liveCtx, payment.id)).rejects.toThrow(
      'does not match',
    );
    nock('https://api.paystack.co')
      .get(`/transaction/verify/${payment.id}`)
      .reply(200, {
        status: true,
        data: {
          id: 123,
          reference: payment.id,
          amount: 50000,
          currency: 'NGN',
          status: 'success',
        },
      });
    expect((await financial.verify(liveCtx, payment.id)).status).toBe(
      'completed',
    );
    const payload = Buffer.from(
      JSON.stringify({
        event: 'charge.success',
        data: { reference: payment.id },
      }),
    );
    const signature = createHmac('sha512', 'sk_live_fixture')
      .update(payload)
      .digest('hex');
    await expect(
      hooks.receive(liveCtx, 'paystack', payload, 'invalid'),
    ).rejects.toThrow('Invalid provider signature');
    await hooks.receive(liveCtx, 'paystack', payload, signature);
    await hooks.receive(liveCtx, 'paystack', payload, signature);
    const receipt = await fetch(
      `${base}/provider-events/${projectId}/paystack`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Paystack-Signature': signature,
        },
        body: payload,
      },
    );
    expect(receipt.status).toBe(200);
    const late = Buffer.from(
      JSON.stringify({
        event: 'charge.failed',
        data: { reference: payment.id },
      }),
    );
    await hooks.receive(
      liveCtx,
      'paystack',
      late,
      createHmac('sha512', 'sk_live_fixture').update(late).digest('hex'),
    );
    expect((await financial.resource(liveCtx, payment.id)).status).toBe(
      'completed',
    );
    const events = await db.manager.find(FinancialEvent, {
      where: { resourceId: payment.id, type: 'payment.completed' },
    });
    expect(events).toHaveLength(1);
    nock('https://api.paystack.co')
      .post('/refund', { transaction: '123', amount: '5000', currency: 'NGN' })
      .reply(200, { status: true, data: { id: 111, status: 'processed' } });
    const refund = await financial.refund(
      liveCtx,
      { payment: payment.id, amount: '5000' },
      'live-partial-refund',
    );
    expect(refund.status).toBe('pending');
    nock('https://api.paystack.co')
      .get('/refund/111')
      .reply(200, {
        status: true,
        data: {
          id: 111,
          status: 'processed',
          transaction: 123,
          amount: 4999,
          currency: 'NGN',
        },
      });
    await expect(financial.verifyRefund(liveCtx, refund.id)).rejects.toThrow(
      'does not match',
    );
    nock('https://api.paystack.co')
      .get('/refund/111')
      .reply(200, {
        status: true,
        data: {
          id: 111,
          status: 'processed',
          transaction: 123,
          amount: 5000,
          currency: 'NGN',
        },
      });
    expect((await financial.verifyRefund(liveCtx, refund.id)).status).toBe(
      'completed',
    );
    expect(nock.isDone()).toBe(true);
  });
  it('does not retry uncertain provider writes and supports explicit sandbox scenarios', async () => {
    const liveCustomer = await financial.customer(
      liveCtx,
      { email: 'timeout@example.test' },
      'timeout-customer',
    );
    nock('https://api.paystack.co')
      .post('/transaction/initialize')
      .replyWithError(
        Object.assign(new Error('fixture timeout'), { code: 'ECONNRESET' }),
      );
    const dto = { customer: liveCustomer.id, amount: '100', currency: 'NGN' };
    const pending = await financial.payment(liveCtx, dto, 'timeout-payment');
    expect(pending.status).toBe('unknown');
    expect(pending.details.providerOutcome).toBe('unknown');
    expect((await financial.payment(liveCtx, dto, 'timeout-payment')).id).toBe(
      pending.id,
    );
    expect(nock.isDone()).toBe(true);
    for (const scenario of [
      'failure',
      'pending',
      'insufficient_funds',
      'timeout',
      'provider_outage',
    ] as const) {
      const item = await financial.payment(
        ctx,
        { customer: customer.id, amount: '100', currency: 'NGN', scenario },
        `scenario-${scenario}`,
      );
      expect(item.status).toBe(
        ['failure', 'insufficient_funds'].includes(scenario)
          ? 'failed'
          : ['timeout', 'provider_outage'].includes(scenario)
            ? 'unknown'
            : 'pending',
      );
    }
  }, 22000);
  it('executes Flutterwave checkout and partial refund using exact minor units and explicit selection', async () => {
    await app.get(ProjectProviderService).configureProvider(
      userId,
      projectId,
      {
        type: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        config: { apiKey: 'flw_fixture', webhookSecret: 'flw_hash_fixture' },
      },
      'production',
    );
    const customer = await financial.customer(
      liveCtx,
      { email: 'flutterwave@example.test' },
      'flw-customer',
    );
    await expect(
      financial.payment(
        liveCtx,
        { customer: customer.id, amount: '50000', currency: 'NGN' },
        'ambiguous-provider',
      ),
    ).rejects.toThrow('explicitly');
    await expect(
      financial.payment(
        liveCtx,
        {
          customer: customer.id,
          amount: '50000',
          currency: 'NGN',
          provider: 'flutterwave',
        },
        'no-callback',
      ),
    ).rejects.toThrow('callbackUrl');
    nock('https://api.flutterwave.com')
      .post(
        '/v3/payments',
        (body) => body.amount === '500.00' && body.currency === 'NGN',
      )
      .reply(200, {
        status: 'success',
        data: { link: 'https://checkout.flutterwave.com/fixture' },
      });
    const payment = await financial.payment(
      liveCtx,
      {
        customer: customer.id,
        amount: '50000',
        currency: 'NGN',
        provider: 'flutterwave',
        callbackUrl: 'https://merchant.example.test/return',
      },
      'flw-payment',
    );
    expect(payment.status).toBe('pending');
    nock('https://api.flutterwave.com')
      .get('/v3/transactions/verify_by_reference')
      .query({ tx_ref: payment.id })
      .reply(200, {
        status: 'success',
        data: {
          id: 9000,
          tx_ref: payment.id,
          amount: '500.00',
          currency: 'NGN',
          status: 'successful',
        },
      });
    const payload = Buffer.from(
      JSON.stringify({
        event: 'charge.completed',
        data: { tx_ref: payment.id },
      }),
    );
    const signature = createHmac('sha256', 'flw_hash_fixture')
      .update(payload)
      .digest('base64');
    await hooks.receive(liveCtx, 'flutterwave', payload, signature);
    expect((await financial.resource(liveCtx, payment.id)).status).toBe(
      'completed',
    );
    nock('https://api.flutterwave.com')
      .post('/v3/transactions/9000/refund', { amount: '100.00' })
      .reply(200, {
        status: 'success',
        data: { id: 9001, status: 'completed' },
      });
    const refund = await financial.refund(
      liveCtx,
      { payment: payment.id, amount: '10000' },
      'flw-refund',
    );
    expect(refund.status).toBe('pending');
    nock('https://api.flutterwave.com')
      .get('/v3/refunds/9001')
      .reply(200, {
        status: 'success',
        data: {
          id: 9001,
          status: 'completed-bank-transfer',
          amount_refunded: '100.00',
          tx_id: 9000,
        },
      });
    expect((await financial.verifyRefund(liveCtx, refund.id)).status).toBe(
      'completed',
    );
    expect(nock.isDone()).toBe(true);
  });
  it('routes multiple eligible providers through an auditable policy', async () => {
    const policy = await financial.saveRoutingPolicy(liveCtx, {
      strategy: 'custom_priority',
      providerPriority: ['flutterwave', 'paystack'],
      requireHealthy: true,
      safeFailover: false,
    });
    expect(policy.providerPriority[0]).toBe('flutterwave');
    const routedCustomer = await financial.customer(
      liveCtx,
      { email: 'routed@example.test' },
      'routed-customer',
    );
    nock('https://api.flutterwave.com')
      .post('/v3/payments')
      .reply(200, {
        status: 'success',
        data: { link: 'https://checkout.flutterwave.com/routed' },
      });
    const routed = await financial.payment(
      liveCtx,
      {
        customer: routedCustomer.id,
        amount: '2500',
        currency: 'NGN',
        callbackUrl: 'https://merchant.example.test/return',
      },
      'routed-payment',
    );
    expect(routed.provider).toBe('flutterwave');
    expect(routed.details.routingDecision).toMatchObject({
      mode: 'policy',
      policyId: policy.id,
      strategy: 'custom_priority',
      selected: 'flutterwave',
      safeFailover: false,
    });
    expect(nock.isDone()).toBe(true);
  });
  it('revokes keys, returns masked listings, and redacts request logs', async () => {
    const keys = app.get(ProjectApiKeyService);
    expect(
      JSON.stringify(await keys.getProjectApiKeys(userId, projectId)),
    ).not.toContain(sandboxKey);
    const other = await app
      .get(ProjectService)
      .createProject(userId, { name: 'Revocable' });
    const list = await keys.getProjectApiKeys(userId, other.id);
    await keys.revokeProjectApiKey(userId, other.id, list[0].id);
    const rotated = await keys.rotateProjectApiKey(
      userId,
      projectId,
      (await keys.getProjectApiKeys(userId, projectId)).find(
        (key) => key.scope === 'live',
      )!.id,
    );
    await expect(keys.verifyProjectApiKey(liveKey)).rejects.toThrow(
      'Invalid project API key',
    );
    expect((await keys.verifyProjectApiKey(rotated.rawKey)).scope).toBe('live');
    await expect(keys.verifyProjectApiKey(other.sandboxKey)).rejects.toThrow(
      'Invalid project API key',
    );
    await financial.log(ctx, 'redaction', 'provider', {
      nested: { apiKey: 'secret', email: 'private@example.test' },
      reference: 'safe',
    });
    const logs = await db.manager.find(FinancialLog, {
      where: { operation: 'redaction' },
    });
    expect(JSON.stringify(logs)).not.toContain('private@example.test');
    expect(JSON.stringify(logs)).not.toContain('secret');
  });
  it('expires request logs after seven days while retaining financial records', async () => {
    const old = await db.manager.save(
      FinancialLog,
      db.manager.create(FinancialLog, {
        ...ctx,
        operation: 'old-log',
        source: 'application',
        details: {},
        createdAt: new Date(Date.now() - 8 * 86400000),
      }),
    );
    await app.get(FinancialRetentionService).cleanLogs();
    expect(await db.manager.findOneBy(FinancialLog, { id: old.id })).toBeNull();
    expect(await financial.resource(ctx, customer.id)).toBeDefined();
  });
  it('rejects cross-tenant dashboard inspection and scopes production data', async () => {
    const jwt = app
      .get(JwtService)
      .sign({ sub: userId, email: 'mvp@example.test', provider: 'local' });
    const headers = {
      Authorization: `Bearer ${jwt}`,
      'X-Environment': 'production',
    };
    const response = await fetch(
      `${base}/projects/${projectId}/financial/resources`,
      { headers },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(
      body.data.every(
        (item: FinancialResource) => item.environment === 'production',
      ),
    ).toBe(true);
    expect(
      (
        await fetch(`${base}/projects/${randomUUID()}/financial/resources`, {
          headers,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${base}/payments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sandboxKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'credentials-payload',
          },
          body: JSON.stringify({
            amount: '1',
            currency: 'NGN',
            customer: customer.id,
            apiKey: 'should-not-be-accepted',
          }),
        })
      ).status,
    ).toBe(400);
  });
  it('completes signup, login, project creation, first operation and event inspection without provider credentials', async () => {
    const signup = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Quickstart developer',
        email: 'signup@example.test',
        password: 'FixtureSignup123!',
        country: 'Nigeria',
        acceptTerms: true,
      }),
    });
    expect(signup.status).toBe(201);
    const user = await db.manager.findOneByOrFail(User, {
      email: 'signup@example.test',
    });
    await db.manager.update(User, user.id, { isEmailVerified: true });
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'FixtureSignup123!',
      }),
    });
    const session = await login.json();
    expect(login.status).toBe(200);
    const token = session.data.token;
    const project = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Signup project' }),
    });
    const created = await project.json();
    expect(project.status).toBe(201);
    expect(created.data.sandboxKey).toMatch(/^op_test_sk_/);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${created.data.sandboxKey}`,
    };
    const wallet = await fetch(`${base}/sandbox/wallets`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'first-wallet' },
      body: JSON.stringify({ currency: 'NGN' }),
    });
    expect(wallet.status).toBe(201);
    const events = await fetch(`${base}/events`, { headers });
    const history = await events.json();
    expect(
      history.data.some(
        (event: FinancialEvent) => event.type === 'wallet.created',
      ),
    ).toBe(true);
    const resources = await fetch(
      `${base}/projects/${created.data.id}/financial/resources`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Environment': 'sandbox',
        },
      },
    );
    expect(resources.status).toBe(200);
  });
  const redisSuite = process.env.TEST_REDIS_PORT ? it : it.skip;
  redisSuite(
    'recovers the outbox, filters events, signs attempts, schedules retries and replays after a worker restart',
    async () => {
      jest
        .spyOn(destination, 'webhookDestination')
        .mockImplementation((value) =>
          Promise.resolve({
            url: new URL(value),
            address: { address: '93.184.216.34', family: 4 },
          }),
        );
      await db.manager.update(
        FinancialEvent,
        { projectId },
        { dispatched: true },
      );
      const endpoint = await hooks.create(ctx, {
        url: 'https://merchant.example.test/hooks',
        events: 'payment.completed',
      });
      await hooks.create(liveCtx, {
        url: 'https://merchant.example.test/production',
        events: 'payment.completed',
      });
      await financial.payment(
        ctx,
        { customer: customer.id, amount: '10', currency: 'NGN' },
        'outbox-completed',
      );
      const pending = await financial.payment(
        ctx,
        {
          customer: customer.id,
          amount: '1',
          currency: 'NGN',
          scenario: 'pending',
        },
        'outbox-recovery',
      );
      const before = await db.manager.count(FinancialDelivery, {
        where: { webhookId: endpoint.id },
      });
      expect(before).toBe(0);
      let checkedSignature = false;
      nock('https://93.184.216.34')
        .post('/hooks')
        .reply(function (_uri, body) {
          const payload = JSON.stringify(body);
          const signature = this.req.headers['ourpocket-signature'];
          if (typeof signature !== 'string')
            throw new Error('Missing signature');
          const parts = signature.split(',');
          const timestamp = parts[0].slice(2);
          expect(parts[1]).toBe(
            `v1=${createHmac('sha256', endpoint.secret).update(`${timestamp}.${payload}`).digest('hex')}`,
          );
          checkedSignature = true;
          return [500, { token: 'private-response-token', message: 'retry' }];
        });
      process.env.FINANCIAL_WEBHOOK_WORKER = 'true';
      process.env.REDIS_HOST = '127.0.0.1';
      process.env.REDIS_PORT = process.env.TEST_REDIS_PORT;
      hooks.onModuleInit();
      await hooks.dispatch();
      const queue = new Queue('financial-webhooks', {
        connection: {
          host: '127.0.0.1',
          port: Number(process.env.TEST_REDIS_PORT),
        },
      });
      const waitFor = async <T>(
        read: () => Promise<T>,
        matches: (value: T) => boolean,
      ) => {
        for (let attempt = 0; attempt < 100; attempt++) {
          const value = await read();
          if (matches(value)) return value;
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        throw new Error('Worker did not reach expected state');
      };
      const delivery = await waitFor(
        () =>
          db.manager.findOne(FinancialDelivery, {
            where: { webhookId: endpoint.id },
            order: { createdAt: 'ASC' },
          }),
        (value) => value?.attempts === 1,
      );
      if (!delivery) throw new Error('Missing delivery');
      expect(checkedSignature).toBe(true);
      expect(JSON.stringify(delivery.history)).not.toContain(
        'private-response-token',
      );
      const job = await waitFor(
        async () => {
          const item = await queue.getJob(delivery.id);
          return item && (await item.getState()) === 'delayed'
            ? item
            : undefined;
        },
        (item) => item !== undefined,
      );
      expect(job?.opts.attempts).toBe(6);
      expect(job?.delay).toBe(60000);
      // A SQL commit before queue insertion is recoverable, and redispatch must not duplicate the event delivery.
      await hooks.onModuleDestroy();
      hooks.onModuleInit();
      await hooks.dispatch();
      expect(
        await db.manager.count(FinancialDelivery, {
          where: { eventId: delivery.eventId, webhookId: endpoint.id },
        }),
      ).toBe(1);
      // Replay creates a fresh delivery of the original event without changing its ID.
      nock('https://93.184.216.34')
        .post('/hooks')
        .reply(200, { accepted: true });
      const replay = await hooks.replay(ctx, delivery.id);
      expect(replay.id).not.toBe(delivery.id);
      expect(replay.eventId).toBe(delivery.eventId);
      await hooks.dispatch();
      await waitFor(
        () => db.manager.findOneByOrFail(FinancialDelivery, { id: replay.id }),
        (value) => value.status === 'completed',
      );
      expect(
        await db.manager.count(FinancialDelivery, {
          where: { eventId: pending.id },
        }),
      ).toBe(0);
      const event = await db.manager.findOneByOrFail(FinancialEvent, {
        id: delivery.eventId,
      });
      expect(event.type).toBe('payment.completed');
      expect(event.environment).toBe('sandbox');
      await queue.close();
      await hooks.onModuleDestroy();
      delete process.env.FINANCIAL_WEBHOOK_WORKER;
      jest.restoreAllMocks();
      nock.cleanAll();
    },
    15000,
  );
});
