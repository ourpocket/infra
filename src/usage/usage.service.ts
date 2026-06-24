import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { TRANSACTION_STATUS_ENUM } from '../enums';
import { ProjectApiKeyRepository } from '../project/project-api-key.repository';
import { ProjectProviderRepository } from '../project/project-provider.repository';
import { ProjectRepository } from '../project/project.repository';
import { TransactionRepository } from '../transactions/transaction.repository';
import { WalletRepository } from '../wallets/wallet.repository';

export interface UsageMetrics {
  totals: {
    apiRequests: number;
    successfulTransactions: number;
    failedTransactions: number;
    activeWallets: number;
    transactionVolume: number;
    successRate: number;
  };
  providerPerformance: Array<{
    provider: string;
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  }>;
  monthlyTransactionVolume: Array<{
    month: string;
    value: number;
  }>;
  apiUsage: Array<{
    day: string;
    requests: number;
  }>;
}

@Injectable()
export class UsageService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectApiKeyRepository: ProjectApiKeyRepository,
    private readonly projectProviderRepository: ProjectProviderRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async getProjectUsage(
    userId: string,
    projectId: string,
  ): Promise<UsageMetrics> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [apiKeys, providers, transactions, activeWallets] = await Promise.all(
      [
        this.projectApiKeyRepository.findAllByProjectId(projectId),
        this.projectProviderRepository.findAllByProjectId(projectId),
        this.transactionRepository.findAllByProjectId(projectId),
        this.walletRepository.countByProjectId(projectId),
      ],
    );

    const apiRequests = apiKeys.reduce((total, key) => total + key.used, 0);
    const successfulTransactions = transactions.filter(
      (transaction) => transaction.status === TRANSACTION_STATUS_ENUM.SUCCESS,
    ).length;
    const failedTransactions = transactions.filter(
      (transaction) => transaction.status === TRANSACTION_STATUS_ENUM.FAILED,
    ).length;
    const completedTransactions = successfulTransactions + failedTransactions;
    const transactionVolume = transactions
      .filter(
        (transaction) => transaction.status === TRANSACTION_STATUS_ENUM.SUCCESS,
      )
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

    return {
      totals: {
        apiRequests,
        successfulTransactions,
        failedTransactions,
        activeWallets,
        transactionVolume,
        successRate: this.percentage(
          successfulTransactions,
          completedTransactions,
        ),
      },
      providerPerformance: providers.map((provider) => {
        const providerTransactions = transactions.filter(
          (transaction) => transaction.provider === provider.type,
        );
        const successful = providerTransactions.filter(
          (transaction) =>
            transaction.status === TRANSACTION_STATUS_ENUM.SUCCESS,
        ).length;
        const failed = providerTransactions.filter(
          (transaction) =>
            transaction.status === TRANSACTION_STATUS_ENUM.FAILED,
        ).length;

        return {
          provider: provider.type,
          total: providerTransactions.length,
          successful,
          failed,
          successRate: this.percentage(successful, successful + failed),
        };
      }),
      monthlyTransactionVolume: this.buildMonthlyVolume(transactions),
      apiUsage: this.buildApiUsage(apiRequests),
    };
  }

  private buildMonthlyVolume(
    transactions: Transaction[],
  ): UsageMetrics['monthlyTransactionVolume'] {
    const months = this.getLastMonths(8);

    return months.map((month) => {
      const value = transactions
        .filter(
          (transaction) =>
            transaction.status === TRANSACTION_STATUS_ENUM.SUCCESS &&
            this.monthKey(transaction.createdAt) === month.key,
        )
        .reduce((total, transaction) => total + Number(transaction.amount), 0);

      return {
        month: month.label,
        value,
      };
    });
  }

  private buildApiUsage(apiRequests: number): UsageMetrics['apiUsage'] {
    const days = this.getLastDays(7);

    return days.map((day, index) => ({
      day,
      requests: index === days.length - 1 ? apiRequests : 0,
    }));
  }

  private getLastMonths(count: number): Array<{ key: string; label: string }> {
    const date = new Date();
    const months: Array<{ key: string; label: string }> = [];

    for (let index = count - 1; index >= 0; index -= 1) {
      const month = new Date(date.getFullYear(), date.getMonth() - index, 1);
      months.push({
        key: this.monthKey(month),
        label: month.toLocaleString('en', { month: 'short' }),
      });
    }

    return months;
  }

  private getLastDays(count: number): string[] {
    const date = new Date();
    const days: string[] = [];

    for (let index = count - 1; index >= 0; index -= 1) {
      const day = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - index,
      );
      days.push(day.toLocaleString('en', { weekday: 'short' }));
    }

    return days;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}`;
  }

  private percentage(numerator: number, denominator: number): number {
    if (denominator === 0) {
      return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(1));
  }
}
