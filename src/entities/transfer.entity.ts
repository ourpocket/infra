import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Wallet } from './wallet.entity';
import { TRANSFER_STATUS_ENUM } from '../enums';

@Entity({ name: 'transfers' })
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.transfers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => Wallet, (wallet: Wallet) => wallet.outgoingTransfers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_wallet_id' })
  fromWallet!: Wallet;

  @ManyToOne(() => Wallet, (wallet: Wallet) => wallet.incomingTransfers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_wallet_id' })
  toWallet!: Wallet;

  @Column({ type: 'numeric' })
  amount!: string;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @Column({ type: 'varchar', length: 20, enum: TRANSFER_STATUS_ENUM })
  status!: TRANSFER_STATUS_ENUM;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
