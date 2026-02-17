import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApiKey } from './api-key.entity';
import { AUTH_TYPE_ENUM } from '../enums';
import { USERS_STATUS_ENUM } from '../enums';

type UsersStatus = USERS_STATUS_ENUM.ACTIVE | USERS_STATUS_ENUM.BANNED;

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Index('ux_users_email', { unique: true })
  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photoUrl?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  companyName?: string | null;

  @Column({ type: 'varchar', length: 20, default: AUTH_TYPE_ENUM.LOCAL })
  provider!: AUTH_TYPE_ENUM;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: USERS_STATUS_ENUM.ACTIVE,
  })
  status?: UsersStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  role?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires?: Date | null;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  acceptTerms!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];
}
