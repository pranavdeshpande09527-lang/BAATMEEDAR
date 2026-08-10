import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { telemetry } from '../../src/logging/telemetry.js';
import { createApp } from '../../src/app.js';

describe('Operational Telemetry & Health Monitoring', () => {
  beforeEach(() => {
    telemetry.resetMetrics();
  });

  describe('TelemetryCollector', () => {
    it('should record requests and status code distribution', () => {
      telemetry.recordRequest('GET', '/verify/run-1', 200, 45);
      telemetry.recordRequest('POST', '/verify', 201, 120);
      telemetry.recordRequest('GET', '/verify/invalid', 404, 10);

      const summary = telemetry.getMetricsSummary();
      expect(summary.requests.total).toBe(3);
      expect(summary.requests.statusDistribution['2xx']).toBe(2);
      expect(summary.requests.statusDistribution['4xx']).toBe(1);
    });

    it('should record verification stage latencies', () => {
      telemetry.recordStageLatency('extracting_claims', 150);
      telemetry.recordStageLatency('extracting_claims', 250);

      const summary = telemetry.getMetricsSummary();
      expect(summary.stageLatencies.extracting_claims.count).toBe(2);
      expect(summary.stageLatencies.extracting_claims.avgMs).toBe(200);
      expect(summary.stageLatencies.extracting_claims.maxMs).toBe(250);
    });

    it('should track error occurrences', () => {
      telemetry.recordError('provider', 'gemini_timeout');
      telemetry.recordError('provider', 'gemini_timeout');

      const summary = telemetry.getMetricsSummary();
      expect(summary.errorCount).toBe(2);
    });
  });

  describe('Health & Telemetry Endpoints', () => {
    const app = createApp({
      config: { server: { corsOrigins: ['*'] } },
    });
    const request = supertest(app);

    it('GET /health/live should return 200 OK', async () => {
      const res = await request.get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptimeSeconds).toBe('number');
    });

    it('GET /health/ready should return readiness status', async () => {
      const res = await request.get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toBeDefined();
    });

    it('GET /health/metrics should return telemetry metrics', async () => {
      const res = await request.get('/health/metrics');
      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.stageLatencies).toBeDefined();
    });
  });
});
