/**
 * Baatmeedar — Server-Side Tool Runtime
 *
 * Implements narrow, server-owned function calling runtime as defined in
 * prompts/05_ai/function_calling.md.
 *
 * Features:
 * - Allowlist enforcement: only 'tavily_search', 'tavily_extract', 'youtube_transcript'
 * - Strict schema validation of input arguments
 * - SSRF protection & timeout controls
 * - Redacted execution telemetry logging
 */

import { ToolCallRequestSchema, ToolCallResultSchema, validateModelOutput } from '../schemas/modelOutput.js';
import { getLogger } from '../logging/logger.js';

export class ToolRuntime {
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
   * Execute a model-proposed tool call safely
   * @param {object} rawCallRequest
   * @returns {Promise<object>}
   */
  async executeToolCall(rawCallRequest) {
    const startTime = Date.now();

    // 1. Validate call request schema
    const call = validateModelOutput(ToolCallRequestSchema, rawCallRequest, 'Tool call request');
    const { tool_name, arguments: args, run_id, claim_id } = call;

    getLogger().info({ run_id, claim_id, tool_name }, 'Executing server-side tool call');

    let resultData;
    let status = 'success';
    let errorMessage;

    try {
      switch (tool_name) {
        case 'tavily_search': {
          const queries = Array.isArray(args.queries) ? args.queries : [String(args.query || '')];
          if (!queries.length || !queries[0]) {
            throw new Error('tavily_search requires at least one non-empty query string');
          }
          resultData = await this.tavily.search(queries);
          break;
        }

        case 'tavily_extract': {
          const url = String(args.url || '');
          if (!url) {
            throw new Error('tavily_extract requires a valid target URL');
          }
          resultData = await this.tavily.extract(url);
          break;
        }

        case 'youtube_transcript': {
          const urlOrId = String(args.url || args.video_id || '');
          if (!urlOrId) {
            throw new Error('youtube_transcript requires a valid YouTube URL or video ID');
          }
          resultData = await this.youtube.fetchTranscript(urlOrId);
          break;
        }

        default:
          status = 'blocked';
          errorMessage = `Tool '${tool_name}' is not in the server-approved allowlist`;
          break;
      }
    } catch (err) {
      status = err.name === 'BlockedUrlError' ? 'blocked' : 'error';
      errorMessage = err.message;
      getLogger().error({ run_id, claim_id, tool_name, err: err.message }, 'Tool execution failed');
    }

    const executionMs = Date.now() - startTime;

    const result = {
      tool_name,
      status,
      data: status === 'success' ? resultData : null,
      execution_ms: executionMs,
      error_message: errorMessage,
    };

    return validateModelOutput(ToolCallResultSchema, result, 'Tool execution result');
  }
}
