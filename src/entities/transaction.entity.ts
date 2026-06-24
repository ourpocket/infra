import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Project } from './project.entity';
import {
  PROVIDER_TYPE_ENUM,
  TRANSACTION_STATUS_ENUM,
  TRANSACTION_TYPE_ENUM,
} from '../enums';

@Entity({ name: 'transactions' })
@Index('ux_transactions_project_reference', ['project', 'reference'], {
  unique: true,
})
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Relation<Project>;

  @Column({ type: 'varchar', length: 20, enum: TRANSACTION_TYPE_ENUM })
  type!: TRANSACTION_TYPE_ENUM;

  @Column({ type: 'varchar', length: 20, enum: TRANSACTION_STATUS_ENUM })
  status!: TRANSACTION_STATUS_ENUM;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PROVIDER_TYPE_ENUM,
    nullable: true,
  })
  provider?: PROVIDER_TYPE_ENUM | null;

  @Column({ type: 'numeric' })
  amount!: string;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @Column({ type: 'varchar', length: 120 })
  reference!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  providerReference?: string | null;

  @Column({ type: 'uuid', nullable: true })
  walletId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  fromWalletId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  toWalletId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  providerPayload?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  response?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
