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
 *
 * ⚠️  RENDER EGRESS NOTE: The youtube-transcript library makes an HTTP request
 * to YouTube's timedtext endpoint. Render's shared egress IPs may be rate-limited
 * or blocked by YouTube's anti-scraping measures. If `extraction_status` is
 * `network_error`, the failure is a connectivity issue, not a missing caption.
 * Consider switching to a transcript proxy (e.g. Supadata, Kome.ai) if this
 * occurs consistently in production.
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
   * Return true if the error looks like a missing/disabled-captions error
   * (as opposed to a network / DNS / TLS failure).
   * The youtube-transcript library throws with messages like:
   *   "Transcript is disabled on this video"
   *   "Could not get the list of transcripts"
   *   "No transcripts were found"
   * @param {Error} err
   */
  _isTranscriptUnavailableError(err) {
    const msg = (err?.message || '').toLowerCase();
    return (
      msg.includes('transcript') ||
      msg.includes('no transcripts') ||
      msg.includes('disabled') ||
      msg.includes('could not retrieve') ||
      msg.includes('too many requests') // YouTube 429 → treat as unavailable, not network failure
    );
  }

  /**
   * Fetch the transcript for a YouTube video URL.
   *
   * Returns one of three extraction_status values:
   *   'success'               — transcript fetched and has content
   *   'unavailable_transcript' — captions disabled / private / not available
   *   'network_error'         — DNS/TLS/egress failure reaching YouTube
   *
   * The orchestrator maps 'network_error' to a user-facing message that
   * correctly identifies this as a server connectivity issue rather than
   * a missing caption.
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
      const isTranscriptErr = this._isTranscriptUnavailableError(err);
      const extractionStatus = isTranscriptErr ? 'unavailable_transcript' : 'network_error';

      if (isTranscriptErr) {
        // Expected: captions are disabled or not available for this video
        getLogger().warn(
          { videoId, err: err.message },
          'YouTube transcript not available for video (captions disabled or private)'
        );
      } else {
        // Unexpected: DNS, TLS, ECONNREFUSED, or Render egress block
        getLogger().error(
          {
            videoId,
            egress_failure: true,
            err: err.message,
          },
          'YouTube transcript retrieval failed due to network/egress error — likely a Render outbound connectivity issue'
        );
      }

      return {
        url: urlStr,
        video_id: videoId,
        publisher: 'YouTube',
        retrieved_at: new Date().toISOString(),
        extraction_status: extractionStatus,
        raw_text: '',
      };
    }
  }
}
