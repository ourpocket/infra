import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Project } from './project.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { ProviderCatalog } from './provider-catalog.entity';

@Entity({ name: 'project_providers' })
export class ProjectProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.providers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Relation<Project>;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PROVIDER_TYPE_ENUM,
  })
  type!: PROVIDER_TYPE_ENUM;

  @Column({ type: 'uuid', name: 'provider_catalog_id', nullable: true })
  providerCatalogId?: string | null;

  @ManyToOne(() => ProviderCatalog, (provider) => provider.projectProviders, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'provider_catalog_id' })
  provider?: Relation<ProviderCatalog> | null;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  environment!: 'sandbox' | 'production' | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', name: 'verified_at', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
