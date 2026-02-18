import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
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

describe('Entities relations execution', () => {
  const entities = [
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

  it('should execute type and inverse functions for all relations', () => {
    const storage = getMetadataArgsStorage();
    const relations = storage.relations.filter((r) =>
      entities.includes(r.target as any),
    );

    const dummy = new Proxy(
      {},
      {
        get: () => undefined,
      },
    );

    for (const rel of relations) {
      if (typeof rel.type === 'function') {
        const t = rel.type as () => unknown;
        t();
        expect(typeof t).toBe('function');
      }

      const maybeInverse =
        (rel as any).inverseSideProperty ?? (rel as any).inverseSide;
      if (typeof maybeInverse === 'function') {
        expect(() => maybeInverse(dummy)).not.toThrow();
      }
    }
  });
});
