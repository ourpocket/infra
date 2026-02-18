import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Wallet } from './wallet.entity';
import { Payment } from './payment.entity';

@Entity({ name: 'project_accounts' })
@Index(
  'ux_project_accounts_external_id_project_id',
  ['externalId', 'project'],
  {
    unique: true,
  },
)
export class ProjectAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 255 })
  externalId!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Wallet, (wallet: Wallet) => wallet.account)
  wallets!: Wallet[];

  @OneToMany(() => Payment, (payment: Payment) => payment.account)
  payments!: Payment[];
}
