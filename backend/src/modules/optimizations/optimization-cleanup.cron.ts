import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OptimizationRunsStore } from './optimization-runs.store.js';

@Injectable()
export class OptimizationCleanupCron {
  private readonly logger = new Logger(OptimizationCleanupCron.name);

  constructor(private readonly runsStore: OptimizationRunsStore) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleCleanup() {
    this.logger.debug('Running scheduled cleanup of expired optimization runs...');
    const deletedCount = await this.runsStore.evictExpired();
    if (deletedCount > 0) {
      this.logger.log(`Successfully cleaned up ${deletedCount} expired optimization runs.`);
    }
  }
}