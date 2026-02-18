import { ApiKey } from '../../src/entities/api-key.entity';
import { Payment } from '../../src/entities/payment.entity';
import { PlatformAccount } from '../../src/entities/platform-account.entity';
import { Project } from '../../src/entities/project.entity';
import { ProjectAccount } from '../../src/entities/project-account.entity';
import { ProjectApiKey } from '../../src/entities/project-api-key.entity';
import { ProjectProvider } from '../../src/entities/project-provider.entity';
import { Transfer } from '../../src/entities/transfer.entity';
import { User } from '../../src/entities/user.entity';
import { UserProvider } from '../../src/entities/user-provider.entity';
import { Wallet } from '../../src/entities/wallet.entity';
import { Webhook } from '../../src/entities/webhook.entity';

describe('Entities instantiate and assign', () => {
  it('User and ApiKey', () => {
    const user = new User();
    user.name = 'n';
    user.email = 'e@x.com';
    user.apiKeys = [];

    const key = new ApiKey();
    key.scope = 'test';
    key.quota = 1;
    key.used = 0;
    key.hashedKey = 'h';
    key.user = user as any;

    expect(user.apiKeys).toEqual([]);
    expect(key.user).toBe(user);
  });

  it('Project and relations', () => {
    const project = new Project();
    project.name = 'p';
    project.slug = 's';
    project.apiKeys = [];
    project.providers = [];
    project.accounts = [];
    project.wallets = [];
    project.payments = [];
    project.transfers = [];
    project.webhooks = [];
    expect(project.slug).toBe('s');
    expect(project.webhooks.length).toBe(0);
  });

  it('Wallet and transfers', () => {
    const wallet = new Wallet();
    wallet.currency = 'NGN';
    wallet.outgoingTransfers = [];
    wallet.incomingTransfers = [];
    expect(wallet.currency).toBe('NGN');
    expect(wallet.outgoingTransfers.length).toBe(0);
  });

  it('Payment and account', () => {
    const payment = new Payment();
    payment.amount = '100';
    payment.currency = 'NGN';
    payment.metadata = { a: 1 } as any;
    expect(payment.currency).toBe('NGN');
    expect(payment.metadata?.a).toBe(1);
  });

  it('PlatformAccount and Project', () => {
    const pa = new PlatformAccount();
    pa.name = 'x';
    pa.projects = [];
    expect(pa.name).toBe('x');
    expect(pa.projects.length).toBe(0);
  });

  it('ProjectAccount and Wallet', () => {
    const acc = new ProjectAccount();
    acc.externalId = 'ext';
    acc.wallets = [];
    expect(acc.externalId).toBe('ext');
    expect(acc.wallets.length).toBe(0);
  });

  it('ProjectApiKey', () => {
    const pak = new ProjectApiKey();
    pak.scope = 'test';
    pak.quota = 1;
    pak.used = 0;
    pak.hashedKey = 'h';
    expect(pak.scope).toBe('test');
    expect(pak.hashedKey).toBe('h');
  });

  it('ProjectProvider', () => {
    const pp = new ProjectProvider();
    pp.isActive = true;
    pp.config = {} as any;
    expect(pp.isActive).toBe(true);
    expect(pp.config).toEqual({});
  });

  it('Transfer', () => {
    const t = new Transfer();
    t.amount = '10';
    t.currency = 'USD';
    expect(t.amount).toBe('10');
    expect(t.currency).toBe('USD');
  });

  it('Webhook', () => {
    const w = new Webhook();
    w.url = 'http://x';
    w.secret = 's';
    w.isActive = false;
    expect(w.url).toBe('http://x');
    expect(w.isActive).toBe(false);
  });

  it('UserProvider', () => {
    const up = new UserProvider();
    up.name = 'np';
    up.isActive = true;
    up.isDeleted = false;
    expect(up.name).toBe('np');
    expect(up.isActive).toBe(true);
  });
});
