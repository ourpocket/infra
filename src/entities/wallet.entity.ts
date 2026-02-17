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
import { ProjectAccount } from './project-account.entity';
import { Transfer } from './transfer.entity';

@Entity({ name: 'wallets' })
@Index(
  'ux_wallets_project_account_currency',
  ['project', 'account', 'currency'],
  {
    unique: true,
  },
)
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.wallets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(
    () => ProjectAccount,
    (account: ProjectAccount) => account.wallets,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'project_account_id' })
  account?: ProjectAccount | null;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Transfer, (transfer: Transfer) => transfer.fromWallet)
  outgoingTransfers!: Transfer[];

  @OneToMany(() => Transfer, (transfer: Transfer) => transfer.toWallet)
  incomingTransfers!: Transfer[];
}
