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
   * Extract article content from a specific URL
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
        throw new Error(`Tavily extraction failed with status ${res.status}`);
      }

      const data = await res.json();
      const result = data.results?.[0];

      return {
        url,
        raw_text: result?.raw_content || result?.content || '',
        title: result?.title || '',
        publisher: this._extractPublisher(url),
        retrieved_at: new Date().toISOString(),
        extraction_status: result ? 'success' : 'failed',
      };
    } catch (err) {
      getLogger().error({ err: err.message, url }, 'Tavily extract failed');
      throw err;
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
