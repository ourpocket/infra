import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

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
  project!: Project;

  @Column({ type: 'enum', enum: ['test', 'live'] })
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
