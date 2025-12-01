import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export type ApiKeyScope = 'test' | 'prod';

@Entity({ name: 'api_keys' })
@Unique(['user', 'scope'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['test', 'prod'] })
  scope!: ApiKeyScope;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column()
  hashedKey!: string;

  @ManyToOne(() => User, (user) => user.apiKeys, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
