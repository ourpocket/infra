import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Project } from './project.entity';
import { PROJECT_API_KEY_SCOPE_ENUM } from '../enums';

export type ProjectApiKeyScope = 'test' | 'live';

@Entity({ name: 'project_api_keys' })
@Unique(['project', 'scope'])
export class ProjectApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.apiKeys, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Relation<Project>;

  @Column({ type: 'enum', enum: PROJECT_API_KEY_SCOPE_ENUM })
  scope!: ProjectApiKeyScope;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'int', default: 1000 })
  quota!: number;

  @Column({ type: 'int', default: 0 })
  used!: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column()
  hashedKey!: string;

  @Column({ type: 'text', nullable: true })
  encryptedKey?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
