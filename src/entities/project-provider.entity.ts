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
import { PROVIDER_TYPE_ENUM } from '../enums';

@Entity({ name: 'project_providers' })
export class ProjectProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.providers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PROVIDER_TYPE_ENUM,
  })
  type!: PROVIDER_TYPE_ENUM;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
