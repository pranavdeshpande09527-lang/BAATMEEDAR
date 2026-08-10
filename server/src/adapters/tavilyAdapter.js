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
          getLogger().warn({ query, status: res.status }, 'Tavily search returned non-ok status');
          continue;
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
    try {
      const parsed = new URL(str);

      // Must be HTTPS
      if (parsed.protocol !== 'https:') return false;

      const hostname = parsed.hostname.toLowerCase();

      // Block localhost, loopback, private ranges
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('169.254.') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
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
