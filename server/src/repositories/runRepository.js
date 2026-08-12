/**
 * Baatmeedar — Verification Run Repository
 *
 * Handles creation, read, stage transitions, ownership filtering, and deletion
 * requests for verification runs.
 * Supports PostgreSQL pool persistence, or explicit in-memory store fallback when
 * DB connection is not configured in local development/test mode.
 *
 * In production/staging or when a database pool is configured, DB failures MUST
 * throw databaseUnavailableError instead of falling back to ephemeral memory.
 */

import { db } from '../db/client.js';
import { getLogger } from '../logging/logger.js';
import { databaseUnavailableError } from '../schemas/errors.js';

class InMemoryRunStore {
  constructor() {
    this.runs = new Map();
    this.claims = new Map(); // run_id -> claim[]
    this.removedOpinions = new Map(); // run_id -> string[]
    this.researchPlans = new Map(); // claim_id -> plan
    this.sources = new Map(); // claim_id -> source[]
    this.verifierResults = new Map(); // claim_id -> verifier_result[]
    this.finalResults = new Map(); // claim_id -> final_result
  }

  create(runData) {
    const now = new Date().toISOString();
    const record = {
      id: runData.id,
      input: {
        type: runData.input_type,
        content: runData.content,
        source_url: runData.source_url || (['article', 'youtube'].includes(runData.input_type) ? runData.content : null),
        publisher: runData.publisher || null,
        retrieved_at: now,
        extraction_status: 'success',
        raw_text_preview: runData.content,
      },
      owner_type: runData.owner_type,
      owner_id: runData.owner_id,
      status: 'accepted',
      current_stage: 'accepted',
      idempotency_key: runData.idempotency_key || null,
      failure: null,
      created_at: now,
      updated_at: now,
    };
    this.runs.set(runData.id, record);
    return record;
  }

  getById(runId, owner) {
    const run = this.runs.get(runId);
    if (!run) return null;
    if (owner && !this._verifyOwnership(run, owner)) return null;
    return run;
  }

  getStatus(runId, owner) {
    const run = this.getById(runId, owner);
    if (!run) return null;
    return {
      status: run.status,
      current_stage: run.current_stage,
      partial: run.partial || null,
      failure: run.failure || null,
    };
  }

  getResults(runId, owner) {
    const run = this.getById(runId, owner);
    if (!run) return null;

    const claims = this.claims.get(runId) || [];
    const removedOpinions = this.removedOpinions.get(runId) || [];
    const research = [];
    const verdicts = [];

    for (const c of claims) {
      const plan = this.researchPlans.get(c.id);
      const sources = this.sources.get(c.id) || [];
      const vResults = this.verifierResults.get(c.id) || [];
      const grokRes = vResults.find((v) => v.verifier === 'grok' || v.verifier === 'groq');
      const geminiRes = vResults.find((v) => v.verifier === 'gemini');
      const finalRes = this.finalResults.get(c.id);

      research.push({
        claim_id: c.id,
        hermes_plan: plan || undefined,
        sources,
        groq_analysis: grokRes?.reasoning || 'Analysis pending.',
        gemini_analysis: geminiRes?.reasoning || 'Analysis pending.',
      });

      const firstVerifierData = grokRes ? {
        verdict: grokRes.verdict,
        confidence: grokRes.confidence,
        reasoning: grokRes.reasoning,
        limitations: grokRes.limitations,
        evidence_ids: grokRes.evidence_ids,
      } : undefined;

      verdicts.push({
        claim_id: c.id,
        grok: firstVerifierData,
        groq: firstVerifierData,
        gemini: geminiRes ? {
          verdict: geminiRes.verdict,
          confidence: geminiRes.confidence,
          reasoning: geminiRes.reasoning,
          limitations: geminiRes.limitations,
          evidence_ids: geminiRes.evidence_ids,
        } : undefined,
        final: finalRes ? {
          verdict: finalRes.verdict,
          rationale: finalRes.rationale,
          sources_cited: finalRes.sources_cited,
          limitations: finalRes.limitations,
        } : undefined,
      });
    }

    return {
      run_id: run.id,
      input: run.input,
      claims,
      removed_opinions: removedOpinions,
      research,
      verdicts,
    };
  }

  updateStage(runId, stage, status = 'processing', partialData = null, failureData = null) {
    const run = this.runs.get(runId);
    if (!run) return null;
    run.current_stage = stage;
    run.status = status;
    run.updated_at = new Date().toISOString();
    if (partialData) {
      run.partial = { ...(run.partial || {}), ...partialData };
    }
    if (failureData) {
      run.failure = failureData;
    }
    return run;
  }

  saveClaims(runId, claims, removedOpinions = []) {
    this.claims.set(runId, claims);
    this.removedOpinions.set(runId, removedOpinions);
  }

  saveResearch(claimId, plan, sources) {
    if (plan) this.researchPlans.set(claimId, plan);
    if (sources) this.sources.set(claimId, sources);
  }

  saveVerifierResult(claimId, verifierResult) {
    const existing = (this.verifierResults.get(claimId) || []).filter(
      (v) => v.verifier !== verifierResult.verifier
    );
    existing.push(verifierResult);
    this.verifierResults.set(claimId, existing);
  }

  reset() {
    this.runs.clear();
    this.claims.clear();
    this.removedOpinions.clear();
    this.researchPlans.clear();
    this.sources.clear();
    this.verifierResults.clear();
    this.finalResults.clear();
  }

  saveFinalResult(claimId, finalResult) {
    this.finalResults.set(claimId, finalResult);
  }

  cancel(runId, owner) {
    const run = this.getById(runId, owner);
    if (!run) return false;
    run.status = 'cancelled';
    run.updated_at = new Date().toISOString();
    return true;
  }

  listByOwner(owner, pagination) {
    const { page = 1, pageSize = 20 } = pagination;
    const all = Array.from(this.runs.values()).filter((r) => this._verifyOwnership(r, owner));
    const start = (page - 1) * pageSize;
    const paged = all.slice(start, start + pageSize);
    return { runs: paged, total: all.length };
  }

  requestDeletion(runId, owner) {
    const run = this.getById(runId, owner);
    if (!run) return false;
    this.runs.delete(runId);
    this.claims.delete(runId);
    this.removedOpinions.delete(runId);
    return true;
  }

  _verifyOwnership(run, owner) {
    if (!owner) return false;
    return run.owner_type === owner.type && run.owner_id === owner.id;
  }
}

const memoryStore = new InMemoryRunStore();

export const runRepository = {
  /**
   * Create a new verification run record
   */
  async create(data) {
    if (!db.pool) return memoryStore.create(data);

    const now = new Date().toISOString();
    const query = `
      INSERT INTO verification_runs (
        id, input_type, input_content, source_url, publisher, retrieved_at,
        extraction_status, raw_text_preview, owner_type, owner_id, status,
        current_stage, idempotency_key, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;
    const sourceUrl = ['article', 'youtube'].includes(data.input_type) ? data.content : null;
    const values = [
      data.id,
      data.input_type,
      data.content,
      sourceUrl,
      data.publisher || null,
      now,
      'success',
      data.content,
      data.owner_type,
      data.owner_id,
      'accepted',
      'accepted',
      data.idempotency_key || null,
      now,
      now,
    ];

    try {
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (err) {
      getLogger().error({ err: err.message, runId: data.id }, 'Database error during run creation');
      throw databaseUnavailableError({ operation: 'create_run', originalError: err.message });
    }
  },

  /**
   * Get run status
   */
  async getStatus(runId, owner) {
    if (!db.pool) return memoryStore.getStatus(runId, owner);

    try {
      const { rows } = await db.query(
        'SELECT status, current_stage, failure, owner_type, owner_id FROM verification_runs WHERE id = $1',
        [runId]
      );
      if (!rows.length) return null;
      const run = rows[0];
      if (owner && (run.owner_type !== owner.type || run.owner_id !== owner.id)) {
        return null;
      }
      return {
        status: run.status,
        current_stage: run.current_stage,
        failure: run.failure || null,
      };
    } catch (err) {
      getLogger().error({ err: err.message, runId }, 'Database error getting status');
      throw databaseUnavailableError({ operation: 'get_status', originalError: err.message });
    }
  },

  /**
   * Get full results
   */
  async getResults(runId, owner) {
    if (!db.pool) return memoryStore.getResults(runId, owner);

    try {
      // Fetch run
      const { rows: runRows } = await db.query(
        'SELECT * FROM verification_runs WHERE id = $1',
        [runId]
      );
      if (!runRows.length) return null;
      const run = runRows[0];

      if (owner && (run.owner_type !== owner.type || run.owner_id !== owner.id)) {
        return null;
      }

      // Fetch claims
      const { rows: claims } = await db.query(
        'SELECT * FROM claims WHERE run_id = $1 ORDER BY claim_index ASC',
        [runId]
      );

      // Fetch removed opinions
      const { rows: opinions } = await db.query(
        'SELECT opinion_text FROM removed_opinions WHERE run_id = $1',
        [runId]
      );

      const research = [];
      const verdicts = [];

      for (const c of claims) {
        const { rows: planRows } = await db.query('SELECT * FROM research_plans WHERE claim_id = $1', [c.id]);
        const { rows: sources } = await db.query('SELECT * FROM sources WHERE claim_id = $1', [c.id]);
        const { rows: vResults } = await db.query('SELECT * FROM verifier_results WHERE claim_id = $1', [c.id]);
        const { rows: finalRows } = await db.query('SELECT * FROM final_results WHERE claim_id = $1', [c.id]);

        const grokRes = vResults.find((v) => v.verifier === 'grok' || v.verifier === 'groq');
        const geminiRes = vResults.find((v) => v.verifier === 'gemini');
        const finalRes = finalRows[0];

        research.push({
          claim_id: c.id,
          hermes_plan: planRows[0] || undefined,
          sources,
          groq_analysis: grokRes?.reasoning || 'Analysis pending.',
          gemini_analysis: geminiRes?.reasoning || 'Analysis pending.',
        });

        const firstVerifierData = grokRes ? {
          verdict: grokRes.verdict,
          confidence: grokRes.confidence,
          reasoning: grokRes.reasoning,
          limitations: grokRes.limitations,
          evidence_ids: grokRes.evidence_ids,
        } : undefined;

        verdicts.push({
          claim_id: c.id,
          grok: firstVerifierData,
          groq: firstVerifierData,
          gemini: geminiRes ? {
            verdict: geminiRes.verdict,
            confidence: geminiRes.confidence,
            reasoning: geminiRes.reasoning,
            limitations: geminiRes.limitations,
            evidence_ids: geminiRes.evidence_ids,
          } : undefined,
          final: finalRes ? {
            verdict: finalRes.verdict,
            rationale: finalRes.rationale,
            sources_cited: finalRes.sources_cited,
            limitations: finalRes.limitations,
          } : undefined,
        });
      }

      return {
        run_id: run.id,
        input: {
          type: run.input_type,
          content: run.input_content,
          source_url: run.source_url,
          publisher: run.publisher,
          retrieved_at: run.retrieved_at,
          extraction_status: run.extraction_status,
          raw_text_preview: run.raw_text_preview,
        },
        claims: claims.map((c) => ({
          id: c.id,
          text: c.text,
          domain: c.domain,
          context: c.context,
          entities: c.entities,
          temporal: c.temporal,
        })),
        removed_opinions: opinions.map((o) => o.opinion_text),
        research,
        verdicts,
      };
    } catch (err) {
      getLogger().error({ err: err.message, runId }, 'Database error getting results');
      throw databaseUnavailableError({ operation: 'get_results', originalError: err.message });
    }
  },

  /**
   * Update run stage & status
   */
  async updateStage(runId, stage, status = 'processing', partialData = null, failureData = null) {
    if (!db.pool) return memoryStore.updateStage(runId, stage, status, partialData, failureData);

    try {
      const now = new Date().toISOString();
      const failureJson = failureData ? JSON.stringify(failureData) : null;
      const { rows } = await db.query(
        `UPDATE verification_runs
         SET current_stage = $1, status = $2, updated_at = $3,
             failure = COALESCE($5::jsonb, failure)
         WHERE id = $4
         RETURNING *;`,
        [stage, status, now, runId, failureJson]
      );
      return rows[0] || null;
    } catch (err) {
      getLogger().error({ err: err.message, runId, stage, status }, 'Database error updating stage');
      throw databaseUnavailableError({ operation: 'update_stage', originalError: err.message });
    }
  },

  /**
   * Save extracted claims
   */
  async saveClaims(runId, claims, removedOpinions = []) {
    if (!db.pool) {
      return memoryStore.saveClaims(runId, claims, removedOpinions);
    }

    try {
      for (let i = 0; i < claims.length; i++) {
        const c = claims[i];
        await db.query(
          `INSERT INTO claims (id, run_id, claim_index, text, domain, context, entities, temporal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING;`,
          [c.id, runId, i, c.text, c.domain, c.context || '', JSON.stringify(c.entities || []), c.temporal || 'unspecified']
        );
      }
      for (const op of removedOpinions) {
        await db.query(
          `INSERT INTO removed_opinions (run_id, opinion_text) VALUES ($1, $2);`,
          [runId, op]
        );
      }
    } catch (err) {
      getLogger().error({ err: err.message, runId }, 'Failed to persist claims in DB');
      throw databaseUnavailableError({ operation: 'save_claims', originalError: err.message });
    }
  },

  /**
   * Save research plan & sources
   */
  async saveResearch(claimId, plan, sources = []) {
    if (!db.pool) {
      return memoryStore.saveResearch(claimId, plan, sources);
    }

    try {
      if (plan) {
        await db.query(
          `INSERT INTO research_plans (claim_id, research_question, required_facts, source_strategy, tavily_queries)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (claim_id) DO NOTHING;`,
          [claimId, plan.research_question, JSON.stringify(plan.required_facts || []), plan.source_strategy || '', JSON.stringify(plan.tavily_queries || [])]
        );
      }
      for (const s of sources) {
        await db.query(
          `INSERT INTO sources (id, claim_id, url, title, publisher, published_date, source_type, authority_rationale, excerpt, stance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING;`,
          [s.id, claimId, s.url, s.title || '', s.publisher || '', s.published_date || '', s.source_type || 'other', s.authority_rationale || '', s.excerpt, s.stance]
        );
      }
    } catch (err) {
      getLogger().error({ err: err.message, claimId }, 'Failed to persist research in DB');
      throw databaseUnavailableError({ operation: 'save_research', originalError: err.message });
    }
  },

  /**
   * Save verifier result
   */
  async saveVerifierResult(claimId, verifierResult) {
    if (!db.pool) {
      return memoryStore.saveVerifierResult(claimId, verifierResult);
    }

    try {
      await db.query(
        `INSERT INTO verifier_results (id, claim_id, verifier, verdict, confidence, reasoning, evidence_ids, limitations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          verifierResult.id || `${verifierResult.verifier}-${claimId}`,
          claimId,
          verifierResult.verifier,
          verifierResult.verdict,
          verifierResult.confidence,
          verifierResult.reasoning,
          JSON.stringify(verifierResult.evidence_ids || []),
          verifierResult.limitations || '',
        ]
      );
    } catch (err) {
      getLogger().error({ err: err.message, claimId }, 'Failed to persist verifier result in DB');
      throw databaseUnavailableError({ operation: 'save_verifier_result', originalError: err.message });
    }
  },

  /**
   * Save final synthesized result
   */
  async saveFinalResult(claimId, finalResult) {
    if (!db.pool) {
      return memoryStore.saveFinalResult(claimId, finalResult);
    }

    try {
      await db.query(
        `INSERT INTO final_results (claim_id, verdict, rationale, supporting_evidence_ids, conflicting_evidence_ids, sources_cited, limitations)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (claim_id) DO UPDATE SET
           verdict = EXCLUDED.verdict,
           rationale = EXCLUDED.rationale,
           supporting_evidence_ids = EXCLUDED.supporting_evidence_ids,
           conflicting_evidence_ids = EXCLUDED.conflicting_evidence_ids,
           sources_cited = EXCLUDED.sources_cited,
           limitations = EXCLUDED.limitations;`,
        [
          claimId,
          finalResult.verdict,
          finalResult.rationale,
          JSON.stringify(finalResult.supporting_evidence_ids || []),
          JSON.stringify(finalResult.conflicting_evidence_ids || []),
          JSON.stringify(finalResult.sources_cited || []),
          finalResult.limitations || '',
        ]
      );
    } catch (err) {
      getLogger().error({ err: err.message, claimId }, 'Failed to persist final result in DB');
      throw databaseUnavailableError({ operation: 'save_final_result', originalError: err.message });
    }
  },

  /**
   * List runs by owner
   */
  async listByOwner(owner, pagination) {
    if (!db.pool) return memoryStore.listByOwner(owner, pagination);

    try {
      const { page = 1, pageSize = 20 } = pagination;
      const offset = (page - 1) * pageSize;

      const { rows: totalRows } = await db.query(
        'SELECT COUNT(*) FROM verification_runs WHERE owner_type = $1 AND owner_id = $2',
        [owner.type, owner.id]
      );
      const total = parseInt(totalRows[0].count, 10);

      const { rows } = await db.query(
        `SELECT id, input_type, input_content, status, current_stage, created_at, updated_at
         FROM verification_runs
         WHERE owner_type = $1 AND owner_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4;`,
        [owner.type, owner.id, pageSize, offset]
      );

      return { runs: rows, total };
    } catch (err) {
      getLogger().error({ err: err.message }, 'Database error listing runs');
      throw databaseUnavailableError({ operation: 'list_by_owner', originalError: err.message });
    }
  },

  /**
   * Request deletion of a run
   */
  async requestDeletion(runId, owner) {
    if (!db.pool) return memoryStore.requestDeletion(runId, owner);

    try {
      const { rowCount } = await db.query(
        'DELETE FROM verification_runs WHERE id = $1 AND owner_type = $2 AND owner_id = $3',
        [runId, owner.type, owner.id]
      );
      return rowCount > 0;
    } catch (err) {
      getLogger().error({ err: err.message, runId }, 'Database error requesting deletion');
      throw databaseUnavailableError({ operation: 'request_deletion', originalError: err.message });
    }
  },

  /**
   * Reset in-memory store (for test cleanup)
   */
  async reset() {
    memoryStore.reset();
  },
};
