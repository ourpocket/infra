// ============================================================================
// Webhook DTOs and Types
// ============================================================================
// Request/response types for webhook endpoints

import { ProviderId } from '../core/types/payment.types';

/**
 * Incoming webhook payload from the Rust webhook service
 */
export interface WebhookEventDto {
  provider: ProviderId;
  transaction_ref: string;
  user_id: string;
  application_id: string;
  status: string;
  amount: number;
  currency: string;
  category: string;
  metadata: Record<string, unknown>;
}

/**
 * Response when webhook is accepted
 */
export interface WebhookAcceptedResponse {
  status: 'accepted';
  transactionRef: string;
}

/**
 * Response when webhook is rejected
 */
export interface WebhookRejectedResponse {
  status: 'rejected';
  transactionRef: string;
}

/**
 * Health check response
 */
export interface WebhookHealthResponse {
  status: 'ok';
}

/**
 * Queue status response
 */
export interface WebhookQueueStatusResponse {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  timestamp: string;
}

/**
 * Failed job item in the failed jobs list
 */
export interface FailedJobItem {
  id: string;
  ref: string;
  url: string;
  attempts: number;
  failedReason: string | undefined;
}

/**
 * Failed jobs response
 */
export interface FailedJobsResponse {
  count: number;
  jobs: FailedJobItem[];
}
