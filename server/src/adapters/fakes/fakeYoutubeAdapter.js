/**
 * Baatmeedar — Fake YouTube Adapter for Deterministic Tests
 */

export class FakeYoutubeAdapter {
  async getTranscript(urlStr) {
    return {
      url: urlStr,
      video_id: 'mockVideoId',
      title: 'Mock Video Title',
      publisher: 'YouTube',
      retrieved_at: new Date().toISOString(),
      extraction_status: 'success',
      raw_text: 'Transcript: Health officials discussed confirmed case counts during the emergency briefing.',
    };
  }
}
