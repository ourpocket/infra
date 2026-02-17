import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PlatformAccount } from './platform-account.entity';
import { ProjectApiKey } from './project-api-key.entity';
import { ProjectProvider } from './project-provider.entity';
import { ProjectAccount } from './project-account.entity';
import { Wallet } from './wallet.entity';
import { Payment } from './payment.entity';
import { Transfer } from './transfer.entity';
import { Webhook } from './webhook.entity';

@Entity({ name: 'projects' })
@Index('ux_projects_slug_platform_account_id', ['slug', 'platformAccount'], {
  unique: true,
})
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(
    () => PlatformAccount,
    (platformAccount: PlatformAccount) => platformAccount.projects,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'platform_account_id' })
  platformAccount!: PlatformAccount;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ProjectApiKey, (apiKey: ProjectApiKey) => apiKey.project)
  apiKeys!: ProjectApiKey[];

  @OneToMany(
    () => ProjectProvider,
    (provider: ProjectProvider) => provider.project,
  )
  providers!: ProjectProvider[];

  @OneToMany(() => ProjectAccount, (account: ProjectAccount) => account.project)
  accounts!: ProjectAccount[];

  @OneToMany(() => Wallet, (wallet: Wallet) => wallet.project)
  wallets!: Wallet[];

  @OneToMany(() => Payment, (payment: Payment) => payment.project)
  payments!: Payment[];

  @OneToMany(() => Transfer, (transfer: Transfer) => transfer.project)
  transfers!: Transfer[];

  @OneToMany(() => Webhook, (webhook: Webhook) => webhook.project)
  webhooks!: Webhook[];
}
