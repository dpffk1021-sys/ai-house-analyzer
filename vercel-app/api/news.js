// 네이버 뉴스 검색 API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ success: false, message: 'API 키가 설정되지 않았습니다.' });
  }

  try {
    const query = encodeURIComponent('서울 부동산 아파트 집값');
    const url   = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=15&sort=date`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, message: `네이버 API 오류: ${response.status}` });
    }

    const data  = await response.json();
    const items = (data.items || []).map(item => ({
      title:   item.title.replace(/<\/?b>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
      link:    item.originallink || item.link,
      source:  item.link.match(/https?:\/\/([^/]+)/)?.[1]?.replace('www.', '') || '',
      pubDate: item.pubDate,
    }));

    return res.status(200).json({ success: true, items, count: items.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
