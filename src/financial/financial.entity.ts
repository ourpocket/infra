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
export type OperationStatus = 'pending' | 'unknown' | 'completed' | 'failed';
export type PaymentProvider = 'paystack' | 'flutterwave';
export type WalletProvider = 'turnkey' | 'privy';
export type FinancialProvider = PaymentProvider | WalletProvider;
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
  @Column('varchar', { nullable: true }) provider!: FinancialProvider | null;
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
    | 'processing'
    | 'completed'
    | 'failed';
  @Column('timestamp', { nullable: true }) leaseExpiresAt!: Date | null;
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
@Entity('financial_routing_policies')
@Index(['projectId', 'environment'], { unique: true })
export class FinancialRoutingPolicy {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar', { default: 'best_success_rate' }) strategy!:
    | 'best_success_rate'
    | 'lowest_fees'
    | 'fastest_response'
    | 'custom_priority';
  @Column('jsonb', { default: () => '\'["paystack","flutterwave"]\'::jsonb' })
  providerPriority!: PaymentProvider[];
  @Column('boolean', { default: true }) requireHealthy!: boolean;
  @Column('boolean', { default: false }) safeFailover!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
@Entity('financial_provider_health')
@Index(['projectId', 'environment', 'provider'], { unique: true })
export class FinancialProviderHealth {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar') provider!: PaymentProvider;
  @Column('varchar', { default: 'healthy' }) status!:
    | 'healthy'
    | 'degraded'
    | 'down';
  @Column('numeric', { precision: 5, scale: 2, default: '100' })
  successRate!: string;
  @Column('int', { default: 0 }) p95LatencyMs!: number;
  @Column('int', { default: 0 }) estimatedFeeBps!: number;
  @UpdateDateColumn() updatedAt!: Date;
}
@Entity('financial_reconciliation_runs')
@Index(['projectId', 'environment', 'createdAt'])
export class FinancialReconciliationRun {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') projectId!: string;
  @Column('varchar') environment!: Environment;
  @Column('varchar', { default: 'completed' }) status!:
    | 'running'
    | 'completed'
    | 'failed';
  @Column('int', { default: 0 }) inspected!: number;
  @Column('int', { default: 0 }) resolved!: number;
  @Column('int', { default: 0 }) unresolved!: number;
  @Column('jsonb', { default: () => "'[]'::jsonb" }) resourceIds!: string[];
  @Column('uuid') requestId!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
export const financialEntities = [
  FinancialResource,
  FinancialIdempotency,
  FinancialEvent,
  FinancialDelivery,
  FinancialReceipt,
  FinancialLog,
  FinancialRoutingPolicy,
  FinancialProviderHealth,
  FinancialReconciliationRun,
];
