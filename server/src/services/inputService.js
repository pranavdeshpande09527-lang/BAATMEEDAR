/**
 * Baatmeedar — Stage 1 Input Service
 *
 * Handles raw input collection and external article/transcript retrieval.
 */

import { getLogger } from '../logging/logger.js';

export class InputService {
  /**
   * @param {object} adapters
   * @param {object} adapters.tavily
   * @param {object} adapters.youtube
   */
  constructor(adapters) {
    this.tavily = adapters.tavily;
    this.youtube = adapters.youtube;
  }

  /**
   * Ingest Stage 1 input
   */
  async processInput(inputType, content) {
    getLogger().info({ inputType }, 'Processing Stage 1 input');

    if (inputType === 'text') {
      return {
        type: 'text',
        content,
        source_url: null,
        publisher: null,
        retrieved_at: new Date().toISOString(),
        extraction_status: 'success',
        raw_text_preview: content,
      };
    }

    if (inputType === 'article') {
      const extracted = await this.tavily.extract(content);
      return {
        type: 'article',
        content,
        source_url: content,
        publisher: extracted.publisher,
        retrieved_at: extracted.retrieved_at,
        extraction_status: extracted.extraction_status,
        raw_text_preview: extracted.raw_text,
      };
    }

    if (inputType === 'youtube') {
      const transcript = await this.youtube.getTranscript(content);
      return {
        type: 'youtube',
        content,
        source_url: content,
        publisher: transcript.publisher,
        retrieved_at: transcript.retrieved_at,
        extraction_status: transcript.extraction_status,
        raw_text_preview: transcript.raw_text,
      };
    }

    throw new Error(`Unsupported input type: ${inputType}`);
  }
}
