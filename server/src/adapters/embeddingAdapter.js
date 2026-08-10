/**
 * Baatmeedar — Embedding Adapter
 *
 * Implements optional semantic embeddings according to prompts/05_ai/embeddings.md.
 * Used exclusively for candidate deduplication and prior run lookup.
 * Vector similarity MUST NEVER be used to determine factual truth or claim verdict.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLogger } from '../logging/logger.js';

export class EmbeddingAdapter {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.modelName = 'embedding-001';
  }

  /**
   * Generate text embedding vector
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    if (!this.genAI) {
      getLogger().debug('Gemini API key not set; returning synthetic embedding vector');
      return this._generateDeterministicFakeEmbedding(text);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      getLogger().error({ err: err.message }, 'Failed to generate text embedding');
      return this._generateDeterministicFakeEmbedding(text);
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param {number[]} vecA
   * @param {number[]} vecB
   * @returns {number}
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Deterministic fake embedding for offline / test environments
   */
  _generateDeterministicFakeEmbedding(text) {
    const dim = 64;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % dim] += text.charCodeAt(i) / 255;
    }
    // Normalize
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map((val) => (norm > 0 ? val / norm : 0));
  }
}
