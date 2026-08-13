/**
 * Baatmeedar — Tavily Search & Retrieval Adapter
 *
 * Handles web search and URL extraction via Tavily API with SSRF defenses:
 * - Public HTTPS protocol enforcement
 * - Blocks local, private, and link-local destinations (127.0.0.1, 10.x, 192.168.x, 169.254.x, localhost)
 * - Response size and timeout limits
 */

import { getLogger } from '../logging/logger.js';
import { blockedUrlError } from '../schemas/errors.js';
import { isSafeHttpsUrl } from '../utils/ssrf.js';

export class TavilyAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.tavily.com';
  }

  /**
   * Search Tavily for queries
   * @param {string[]} queries
   */
  async search(queries) {
    const results = [];
    for (const query of queries) {
      try {
        const res = await fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: this.apiKey,
            query,
            search_depth: 'advanced',
            include_answer: false,
            max_results: 5,
          }),
        });

        if (!res.ok) {
          const error = new Error(`Tavily search failed with status ${res.status}`);
          error.provider = 'tavily';
          error.status = res.status;
          throw error;
        }

        const data = await res.json();
        if (data.results) {
          for (const item of data.results) {
            // Validate URL for SSRF safety
            if (this._isSafeUrl(item.url)) {
              results.push({
                url: item.url,
                title: item.title || '',
                snippet: item.content || '',
                score: item.score || 0,
                published_date: item.published_date || null,
              });
            }
          }
        }
      } catch (err) {
        getLogger().error({ err: err.message, query }, 'Tavily search query failed');
        throw err;
      }
    }
    return results;
  }

  /**
   * Extract article content from a specific URL.
   * extraction_status is 'failed' when raw_text is empty (e.g. paywalled /
   * JS-rendered pages that return a result object with no readable content).
   */
  async extract(url) {
    if (!this._isSafeUrl(url)) {
      throw blockedUrlError('Target URL is not permitted for retrieval (SSRF protection).');
    }

    try {
      const res = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          urls: [url],
        }),
      });

      if (!res.ok) {
        getLogger().warn(
          { status: res.status, url, providerHttpStatus: res.status },
          'Tavily extract returned non-ok HTTP status'
        );
        return {
          url,
          raw_text: '',
          title: '',
          publisher: this._extractPublisher(url),
          retrieved_at: new Date().toISOString(),
          extraction_status: 'failed',
        };
      }

      const data = await res.json();
      const result = data.results?.[0];
      let rawText = (result?.raw_content || result?.content || '').trim();
      if (rawText.length > 15000) {
        rawText = rawText.slice(0, 15000);
      }

      return {
        url,
        raw_text: rawText,
        title: result?.title || '',
        publisher: this._extractPublisher(url),
        retrieved_at: new Date().toISOString(),
        extraction_status: rawText.trim() ? 'success' : 'failed',
      };
    } catch (err) {
      if (err.code === 'SSRF_BLOCKED' || err.status === 400) throw err;

      // Re-throw fetch-level errors (DNS, TLS, ECONNREFUSED, Render egress blocks)
      // so the orchestrator captures the real error in the run record.
      // These are NOT normal "extraction failed" cases — they indicate a
      // server-side connectivity problem that swallowing would hide.
      const isFetchError =
        err.cause?.code === 'ECONNREFUSED' ||
        err.cause?.code === 'ENOTFOUND' ||
        err.cause?.code === 'ETIMEDOUT' ||
        /fetch failed|network|econnrefused|enotfound|etimedout/i.test(err.message);

      if (isFetchError) {
        getLogger().error(
          { err: err.message, url, egress_failure: true },
          'Tavily extract failed with network/egress error — re-throwing for orchestrator'
        );
        throw err;
      }

      getLogger().error({ err: err.message, url }, 'Tavily extract failed');
      return {
        url,
        raw_text: '',
        title: '',
        publisher: this._extractPublisher(url),
        retrieved_at: new Date().toISOString(),
        extraction_status: 'failed',
      };
    }
  }

  /**
   * SSRF URL Validation
   */
  _isSafeUrl(str) {
    return isSafeHttpsUrl(str);
  }

  _extractPublisher(urlStr) {
    try {
      const u = new URL(urlStr);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'Web Source';
    }
  }
}
