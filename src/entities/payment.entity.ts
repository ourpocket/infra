import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectAccount } from './project-account.entity';
import { Wallet } from './wallet.entity';
import { PAYMENT_STATUS_ENUM, PROVIDER_TYPE_ENUM } from '../enums';

@Entity({ name: 'payments' })
@Index(
  'ux_payments_project_external_reference',
  ['project', 'externalReference'],
  {
    unique: true,
  },
)
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(
    () => ProjectAccount,
    (account: ProjectAccount) => account.payments,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'project_account_id' })
  account?: ProjectAccount | null;

  @ManyToOne(() => Wallet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalReference?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  providerReference?: string | null;

  @Column({ type: 'varchar', length: 20, enum: PROVIDER_TYPE_ENUM })
  provider!: PROVIDER_TYPE_ENUM;

  @Column({ type: 'numeric' })
  amount!: string;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @Column({ type: 'varchar', length: 20, enum: PAYMENT_STATUS_ENUM })
  status!: PAYMENT_STATUS_ENUM;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  providerPayload?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
