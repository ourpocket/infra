import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import {
  PROVIDER_CAPABILITY_ENUM,
  PROVIDER_CATALOG_STATUS_ENUM,
  PROVIDER_CATEGORY_ENUM,
  PROVIDER_TYPE_ENUM,
} from '../enums';
import { ProjectProvider } from './project-provider.entity';

export interface ProviderCredentialField {
  key: string;
  label: string;
  type: 'secret' | 'text';
  required: boolean;
  placeholder?: string;
}

@Entity({ name: 'provider_catalog' })
export class ProviderCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_provider_catalog_slug', { unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 120, name: 'logo_asset' })
  logoAsset!: string;

  @Column({ type: 'varchar', length: 40 })
  category!: PROVIDER_CATEGORY_ENUM;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  capabilities!: PROVIDER_CAPABILITY_ENUM[];

  @Column({
    type: 'jsonb',
    name: 'credential_fields',
    default: () => "'[]'::jsonb",
  })
  credentialFields!: ProviderCredentialField[];

  @Column({ type: 'varchar', length: 20, name: 'adapter_type', nullable: true })
  adapterType?: PROVIDER_TYPE_ENUM | null;

  @Column({
    type: 'enum',
    enum: PROVIDER_CATALOG_STATUS_ENUM,
    enumName: 'provider_catalog_status_enum',
    default: PROVIDER_CATALOG_STATUS_ENUM.COMING_SOON,
  })
  status!: PROVIDER_CATALOG_STATUS_ENUM;

  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(
    () => ProjectProvider,
    (projectProvider) => projectProvider.provider,
  )
  projectProviders!: Relation<ProjectProvider[]>;
}
