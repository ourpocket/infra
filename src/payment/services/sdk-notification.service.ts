// ============================================================================
// SDK Notification Service
// ============================================================================
// Notifies our SDK clients about payment events via WebSocket/push channels.
// This complements the webhook callbacks to client APIs.

import { Injectable, Logger } from '@nestjs/common';
import { Payment } from '../core/types/payment.types';

export interface SdkNotification {
  event: 'payment.success' | 'payment.failed' | 'payment.pending';
  provider: Payment['provider'];
  transactionRef: string;
  status: string;
  amount: number;
  currency: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SdkNotificationService {
  private readonly logger = new Logger(SdkNotificationService.name);
  // In production: WebSocket server, push notification service, or event stream
  private readonly activeConnections = new Map<string, Set<string>>(); // userId -> connectionIds

  /**
   * Notify SDK clients about a payment event
   * This is in addition to webhook callbacks to client APIs
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async notify(
    payment: Payment,
    event: 'payment.success' | 'payment.failed' | 'payment.pending',
  ): Promise<void> {
    const notification: SdkNotification = {
      event,
      provider: payment.provider,
      transactionRef: payment.providerRef,
      status: payment.status,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      timestamp: new Date().toISOString(),
      metadata: (payment as any).metadata,
    };

    this.logger.log(`SDK notification for ${payment.providerRef}: ${event}`);

    // In production, broadcast via:
    // 1. WebSocket to connected SDK clients
    // 2. Push notification service (FCM, APNs)
    // 3. Server-Sent Events (SSE)
    // 4. Redis Pub/Sub for distributed notification

    // For now, log the notification (placeholder for real implementation)
    this.broadcastToSdk(notification);
  }

  /**
   * Broadcast notification to all connected SDK clients
   */
  private broadcastToSdk(notification: SdkNotification): void {
    // TODO: Implement real-time broadcast
    // Example implementations:

    // 1. WebSocket broadcast:
    // this.websocketServer.emit('payment-event', notification);

    // 2. Redis Pub/Sub:
    // await this.redis.publish('sdk:notifications', JSON.stringify(notification));

    // 3. Server-Sent Events:
    // this.sseService.broadcast('payment-events', notification);

    // Placeholder: log for debugging
    this.logger.debug(`SDK broadcast: ${JSON.stringify(notification)}`);
  }

  /**
   * Register an SDK connection (for WebSocket/SSE)
   */
  registerConnection(userId: string, connectionId: string): void {
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, new Set());
    }
    this.activeConnections.get(userId)!.add(connectionId);
    this.logger.debug(
      `SDK connection registered: ${userId} -> ${connectionId}`,
    );
  }

  /**
   * Unregister an SDK connection
   */
  unregisterConnection(userId: string, connectionId: string): void {
    const connections = this.activeConnections.get(userId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.activeConnections.delete(userId);
      }
      this.logger.debug(`SDK connection removed: ${userId} -> ${connectionId}`);
    }
  }

  /**
   * Get count of active SDK connections
   */
  getConnectionCount(): number {
    let count = 0;
    this.activeConnections.forEach((set) => {
      count += set.size;
    });
    return count;
  }

  /**
   * Notify a specific user's SDK connections
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async notifyUser(
    userId: string,
    notification: SdkNotification,
  ): Promise<void> {
    const connections = this.activeConnections.get(userId);
    if (!connections || connections.size === 0) {
      this.logger.debug(`No active SDK connections for user ${userId}`);
      return;
    }

    this.logger.log(
      `Notifying ${connections.size} SDK connection(s) for user ${userId}`,
    );
    // In production: send to specific connections
    // connections.forEach(connId => this.sendToConnection(connId, notification));
  }
}
