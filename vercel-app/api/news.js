// 부동산 뉴스 RSS 프록시 — 안정적인 다중 소스
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sources = [
    'https://www.hankyung.com/feed/realestate',
    'https://www.chosun.com/arc/outboundfeeds/rss/category/economy/realestate/',
    'https://biz.chosun.com/arc/outboundfeeds/rss/category/real_estate/',
  ];

  function parseRSS(xml) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const b = m[1];
      const get = tag => {
        const r = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
        const found = b.match(r);
        return found ? found[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").trim() : '';
      };
      // link 처리 (self-closing 태그 대응)
      const linkRaw = get('link') || (b.match(/https?:\/\/[^\s<"]+/) || [])[0] || '';
      const title = get('title').replace(/\s*[-|]\s*[^-|]+$/, '');
      const pubDate = get('pubDate');
      const source = get('source') || get('author') || '';
      if (title && linkRaw && items.length < 12) {
        items.push({ title, link: linkRaw, source, pubDate });
      }
    }
    return items;
  }

  for (const url of sources) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) continue;
      const xml = await r.text();
      if (!xml.includes('<item>')) continue;
      const items = parseRSS(xml);
      if (items.length > 0) {
        return res.status(200).json({ success: true, items, source: url });
      }
    } catch { continue; }
  }

  return res.status(200).json({ success: false, items: [], message: '뉴스 소스 연결 실패' });
}
