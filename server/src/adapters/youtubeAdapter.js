/**
 * Baatmeedar — YouTube Adapter
 *
 * Retrieves video transcripts for YouTube URLs using the public timedtext
 * caption endpoint (no OAuth required). Falls back to unavailable_transcript
 * when captions are disabled or private.
 *
 * Note: this.apiKey (YOUTUBE_API_KEY) is retained for future use fetching
 * video metadata via the YouTube Data API v3 videos.list endpoint.
 * It cannot fetch captions for third-party videos — that requires channel-owner OAuth.
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { getLogger } from '../logging/logger.js';
import { DEFAULTS } from '../config/defaults.js';

export class YoutubeAdapter {
  constructor(apiKey) {
    // Stored for future metadata lookups (videos.list); not used for captions.
    this.apiKey = apiKey;
  }

  /**
   * Extract video ID from supported YouTube URL forms.
   */
  extractVideoId(urlStr) {
    try {
      const u = new URL(urlStr);
      if (!DEFAULTS.youtube.allowedHostnames.includes(u.hostname)) return null;

      if (u.hostname === 'youtu.be') {
        return u.pathname.slice(1).split('?')[0];
      }
      return u.searchParams.get('v');
    } catch {
      return null;
    }
  }

  /**
   * Fetch the transcript for a YouTube video URL.
   * Returns extraction_status: 'success' with joined raw_text on success,
   * or extraction_status: 'unavailable_transcript' with empty raw_text when
   * captions are disabled, private, or otherwise inaccessible.
   */
  async getTranscript(urlStr) {
    const videoId = this.extractVideoId(urlStr);
    if (!videoId) {
      throw new Error('Invalid YouTube URL or unsupported hostname.');
    }

    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId);
      const rawText = segments.map((s) => s.text).join(' ').trim();

      return {
        url: urlStr,
        video_id: videoId,
        title: 'YouTube Video',
        publisher: 'YouTube',
        retrieved_at: new Date().toISOString(),
        extraction_status: rawText ? 'success' : 'unavailable_transcript',
        raw_text: rawText,
      };
    } catch (err) {
      getLogger().error({ err: err.message, videoId }, 'YouTube transcript retrieval failed');
      return {
        url: urlStr,
        video_id: videoId,
        publisher: 'YouTube',
        retrieved_at: new Date().toISOString(),
        extraction_status: 'unavailable_transcript',
        raw_text: '',
      };
    }
  }
}
