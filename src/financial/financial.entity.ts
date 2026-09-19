import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
export type Environment = 'sandbox' | 'production';
export type ResourceKind =
  | 'customer'
  | 'payment'
  | 'refund'
  | 'wallet'
  | 'transfer';
export type OperationStatus = 'pending' | 'completed' | 'failed';
export type PaymentProvider = 'paystack' | 'flutterwave';
@Entity('financial_resources')
@Index(['projectId', 'environment', 'kind'])
export class FinancialResource {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar') kind!: ResourceKind;
  @Column('varchar', { default: 'pending' }) status!: OperationStatus;
  @Column('numeric', { precision: 38, scale: 0, nullable: true }) amount!:
    | string
    | null;
  @Column('varchar', { nullable: true }) currency!: string | null;
  @Column('varchar', { nullable: true }) provider!: PaymentProvider | null;
  @Column('varchar', { nullable: true }) providerReference!: string | null;
  @Column('uuid', { nullable: true }) parentId!: string | null;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) details!: Record<
    string,
    unknown
  >;
  @Column('uuid') requestId!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
@Entity('financial_idempotency')
@Index(['projectId', 'environment', 'key'], { unique: true })
export class FinancialIdempotency {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar', { length: 200 }) key!: string;
  @Column('varchar') fingerprint!: string;
  @Column('uuid') resourceId!: string;
  @CreateDateColumn() createdAt!: Date;
}
@Entity('financial_events')
@Index(['projectId', 'environment'])
export class FinancialEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar') type!: string;
  @Column('uuid') resourceId!: string;
  @Column('uuid') requestId!: string;
  @Column('jsonb') data!: Record<string, unknown>;
  @Column('boolean', { default: false }) dispatched!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
@Entity('financial_deliveries')
@Index(['projectId', 'environment'])
export class FinancialDelivery {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('uuid') eventId!: string;
  @Column('uuid') requestId!: string;
  @Column('uuid') webhookId!: string;
  @Column('varchar', { default: 'pending' }) status!:
    | 'pending'
    | 'completed'
    | 'failed';
  @Column('int', { default: 0 }) attempts!: number;
  @Column('jsonb', { default: () => "'[]'::jsonb" }) history!: Array<{
    attemptedAt: string;
    statusCode: number | null;
    latencyMs: number;
    response: string;
  }>;
  @CreateDateColumn() createdAt!: Date;
}
@Entity('financial_receipts')
@Index(['projectId', 'environment', 'hash'], { unique: true })
export class FinancialReceipt {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar') hash!: string;
  @Column('varchar') provider!: PaymentProvider;
  @Column('jsonb') payload!: Record<string, unknown>;
  @Column('boolean', { default: false }) processed!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
@Entity('financial_logs')
@Index(['projectId', 'environment', 'createdAt'])
export class FinancialLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('uuid') requestId!: string;
  @Column('varchar') operation!: string;
  @Column('varchar') source!: 'application' | 'provider';
  @Column('jsonb') details!: Record<string, unknown>;
  @CreateDateColumn() createdAt!: Date;
}
export const financialEntities = [
  FinancialResource,
  FinancialIdempotency,
  FinancialEvent,
  FinancialDelivery,
  FinancialReceipt,
  FinancialLog,
];
