import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Project } from '../../src/entities/project.entity';
import { PlatformAccount } from '../../src/entities/platform-account.entity';
import { Payment } from '../../src/entities/payment.entity';
import { ProjectAccount } from '../../src/entities/project-account.entity';
import { Wallet } from '../../src/entities/wallet.entity';
import { ProjectApiKey } from '../../src/entities/project-api-key.entity';
import { ProjectProvider } from '../../src/entities/project-provider.entity';
import { Webhook } from '../../src/entities/webhook.entity';
import { Transfer } from '../../src/entities/transfer.entity';
import { ApiKey } from '../../src/entities/api-key.entity';
import { User } from '../../src/entities/user.entity';
import { UserProvider } from '../../src/entities/user-provider.entity';

describe('Entities metadata', () => {
  it('indices should be registered with correct uniqueness', () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices;

    const byTarget = (target: any) =>
      indices.filter((i) => i.target === target);

    const projectIdx = byTarget(Project).find(
      (i) => i.name === 'ux_projects_slug_platform_account_id',
    );
    expect(projectIdx).toBeDefined();
    expect(projectIdx?.unique).toBe(true);

    const paIdx = byTarget(PlatformAccount).find(
      (i) => i.name === 'ux_platform_accounts_user_id',
    );
    expect(paIdx).toBeDefined();
    expect(paIdx?.unique).toBe(true);

    const paymentIdx = byTarget(Payment).find(
      (i) => i.name === 'ux_payments_project_external_reference',
    );
    expect(paymentIdx).toBeDefined();
    expect(paymentIdx?.unique).toBe(true);

    const projectAccountIdx = byTarget(ProjectAccount).find(
      (i) => i.name === 'ux_project_accounts_external_id_project_id',
    );
    expect(projectAccountIdx).toBeDefined();
    expect(projectAccountIdx?.unique).toBe(true);

    const walletIdx = byTarget(Wallet).find(
      (i) => i.name === 'ux_wallets_project_account_currency',
    );
    expect(walletIdx).toBeDefined();
    expect(walletIdx?.unique).toBe(true);
  });

  it('join columns should be present for entity relations', () => {
    const storage = getMetadataArgsStorage();
    const joins = storage.joinColumns;

    const byTarget = (target: any) => joins.filter((j) => j.target === target);

    const projectPlatformJoin = byTarget(Project).find(
      (j) => j.name === 'platform_account_id',
    );
    expect(projectPlatformJoin).toBeDefined();

    const paymentProjectJoin = byTarget(Payment).find(
      (j) => j.name === 'project_id',
    );
    expect(paymentProjectJoin).toBeDefined();

    const paymentAccountJoin = byTarget(Payment).find(
      (j) => j.name === 'project_account_id',
    );
    expect(paymentAccountJoin).toBeDefined();

    const paymentWalletJoin = byTarget(Payment).find(
      (j) => j.name === 'wallet_id',
    );
    expect(paymentWalletJoin).toBeDefined();

    const transferFromWalletJoin = byTarget(Transfer).find(
      (j) => j.name === 'from_wallet_id',
    );
    expect(transferFromWalletJoin).toBeDefined();

    const transferToWalletJoin = byTarget(Transfer).find(
      (j) => j.name === 'to_wallet_id',
    );
    expect(transferToWalletJoin).toBeDefined();

    const projectAccountProjectJoin = byTarget(ProjectAccount).find(
      (j) => j.name === 'project_id',
    );
    expect(projectAccountProjectJoin).toBeDefined();
  });

  it('entity registration is present for all domain entities', () => {
    const storage = getMetadataArgsStorage();
    const entities = storage.tables.map((t) => t.target);
    const expected = [
      ApiKey,
      Payment,
      PlatformAccount,
      Project,
      ProjectAccount,
      ProjectApiKey,
      ProjectProvider,
      Transfer,
      User,
      UserProvider,
      Wallet,
      Webhook,
    ];

    for (const e of expected) {
      expect(entities).toContain(e);
    }
  });
});
