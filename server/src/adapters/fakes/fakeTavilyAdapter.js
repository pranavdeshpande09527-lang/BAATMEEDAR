/**
 * Baatmeedar — Fake Tavily Adapter for Deterministic Tests
 */

export class FakeTavilyAdapter {
  async search(queries) {
    return [
      {
        url: 'https://www.who.int/news/item/14-08-2024-mpox-declaration',
        title: 'WHO Director-General declares mpox outbreak a public health emergency',
        snippet: 'I am declaring the upsurge of mpox in Africa a public health emergency of international concern (PHEIC).',
        score: 0.98,
        published_date: '2024-08-14',
      },
    ];
  }

  async extract(url) {
    return {
      url,
      raw_text: 'The World Health Organization declared the mpox outbreak a PHEIC on August 14, 2024.',
      title: 'WHO Mpox Declaration',
      publisher: 'who.int',
      retrieved_at: new Date().toISOString(),
      extraction_status: 'success',
    };
  }
}
