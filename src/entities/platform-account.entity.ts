import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

@Entity({ name: 'platform_accounts' })
export class PlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  @Index('ux_platform_accounts_user_id', { unique: true })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Project, (project: Project) => project.platformAccount)
  projects!: Project[];
}
