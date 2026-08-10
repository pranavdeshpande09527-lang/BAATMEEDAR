/**
 * Baatmeedar — Status Publisher Service
 *
 * Updates stage and status state transitions in persistence.
 */

import { getLogger } from '../logging/logger.js';

export class StatusPublisher {
  constructor(runRepository) {
    this.runRepository = runRepository;
  }

  async publishStage(runId, stage, status = 'processing', partial = null) {
    getLogger().info({ runId, stage, status }, 'Publishing workflow stage update');
    if (this.runRepository) {
      await this.runRepository.updateStage(runId, stage, status, partial);
    }
  }
}
