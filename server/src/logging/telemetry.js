/**
 * Baatmeedar — Operational Telemetry & Monitoring
 *
 * Privacy-safe operational metrics collector tracking:
 * - Request counts & HTTP status code distribution
 * - Workflow stage execution latencies
 * - External provider failure / rate-limit counts
 * - Final verification verdict breakdown
 * No raw user prompts, claim text, or provider keys are stored in metrics.
 */

class TelemetryCollector {
  constructor() {
    this.resetMetrics();
  }

  resetMetrics() {
    this.metrics = {
      startTime: new Date().toISOString(),
      requests: {
        total: 0,
        byStatus: {},
        byRoute: {},
      },
      stageLatencyMs: {
        input_received: { count: 0, totalMs: 0, maxMs: 0 },
        extracting_claims: { count: 0, totalMs: 0, maxMs: 0 },
        researching: { count: 0, totalMs: 0, maxMs: 0 },
        verifying: { count: 0, totalMs: 0, maxMs: 0 },
        synthesizing: { count: 0, totalMs: 0, maxMs: 0 },
      },
      errors: {
        total: 0,
        byCategory: {},
      },
      verdicts: {
        true: 0,
        mostly_true: 0,
        half_true: 0,
        mostly_false: 0,
        false: 0,
        unverified: 0,
      },
      activeRuns: 0,
    };
  }

  /**
   * Record HTTP request metric
   */
  recordRequest(method, path, statusCode, durationMs) {
    this.metrics.requests.total++;

    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    this.metrics.requests.byStatus[statusKey] = (this.metrics.requests.byStatus[statusKey] || 0) + 1;

    const routeKey = `${method} ${path.split('?')[0]}`;
    if (!this.metrics.requests.byRoute[routeKey]) {
      this.metrics.requests.byRoute[routeKey] = { count: 0, totalMs: 0 };
    }
    this.metrics.requests.byRoute[routeKey].count++;
    this.metrics.requests.byRoute[routeKey].totalMs += durationMs;
  }

  /**
   * Record 5-stage verification stage latency
   */
  recordStageLatency(stage, durationMs) {
    if (this.metrics.stageLatencyMs[stage]) {
      const stageRecord = this.metrics.stageLatencyMs[stage];
      stageRecord.count++;
      stageRecord.totalMs += durationMs;
      if (durationMs > stageRecord.maxMs) {
        stageRecord.maxMs = durationMs;
      }
    }
  }

  /**
   * Increment active verification run gauge
   */
  incrementActiveRuns() {
    this.metrics.activeRuns++;
  }

  /**
   * Decrement active verification run gauge
   */
  decrementActiveRuns() {
    this.metrics.activeRuns = Math.max(0, this.metrics.activeRuns - 1);
  }

  /**
   * Record categorized error metric
   */
  recordError(category, errorCode = 'unknown') {
    this.metrics.errors.total++;
    const key = `${category}:${errorCode}`;
    this.metrics.errors.byCategory[key] = (this.metrics.errors.byCategory[key] || 0) + 1;
  }

  /**
   * Record verdict summary metric
   */
  recordVerdict(verdict) {
    if (verdict && this.metrics.verdicts[verdict] !== undefined) {
      this.metrics.verdicts[verdict]++;
    }
  }

  /**
   * Export privacy-safe metrics summary
   */
  getMetricsSummary() {
    const summary = {
      uptimeSeconds: Math.floor((Date.now() - new Date(this.metrics.startTime).getTime()) / 1000),
      requests: {
        total: this.metrics.requests.total,
        statusDistribution: { ...this.metrics.requests.byStatus },
      },
      stageLatencies: {},
      errorCount: this.metrics.errors.total,
      verdictDistribution: { ...this.metrics.verdicts },
      activeVerificationRuns: this.metrics.activeRuns,
    };

    for (const [stage, data] of Object.entries(this.metrics.stageLatencyMs)) {
      summary.stageLatencies[stage] = {
        count: data.count,
        avgMs: data.count > 0 ? Math.round(data.totalMs / data.count) : 0,
        maxMs: data.maxMs,
      };
    }

    return summary;
  }
}

export const telemetry = new TelemetryCollector();
