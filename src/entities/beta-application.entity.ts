import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'beta_applications' })
@Index('ux_beta_applications_email', ['email'], { unique: true })
export class BetaApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  companyName?: string | null;

  @Column({ type: 'varchar', length: 80 })
  useCase!: string;

  @Column({ type: 'varchar', length: 32, default: 'received' })
  status!: 'received' | 'invited' | 'declined';

  @CreateDateColumn()
  createdAt!: Date;
}
