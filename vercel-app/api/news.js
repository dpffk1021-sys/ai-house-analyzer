// 부동산 뉴스 RSS 프록시 (Google News RSS → JSON 변환)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const query  = '서울 부동산 아파트 집값';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await response.text();

    // XML 파싱 (정규식으로 간단 추출)
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`));
        return m ? m[1].trim() : '';
      };

      const title  = get('title').replace(/ - [^-]+$/, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const link   = get('link') || block.match(/<link\s*\/>.*?(https?:\/\/[^\s<]+)/)?.[1] || '';
      const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.trim() || '';
      const pubDate= get('pubDate');

      if (title && items.length < 10) {
        items.push({ title, link, source, pubDate });
      }
    }

    return res.status(200).json({ success: true, items, count: items.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
