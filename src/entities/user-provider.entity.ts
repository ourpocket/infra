import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';

@Entity({ name: 'user_providers' })
export class UserProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ix_user_providers_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PROVIDER_TYPE_ENUM,
  })
  type!: PROVIDER_TYPE_ENUM;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
