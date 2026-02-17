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

@Entity({ name: 'webhooks' })
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.webhooks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 255 })
  url!: string;

  @Column({ type: 'varchar', length: 255 })
  secret!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  eventTypes?: string[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
