const fs = require('fs');
let html = fs.readFileSync('./index.html', 'utf8');

// BOK fetch → /api/rate
html = html.replace(
  "const url  = `https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/5/722Y001/M/${prev}/${ym}`;",
  "const url  = '/api/rate';"
);
html = html.replace(
  "const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });\n    const data = await res.json();\n    const rows = data?.StatisticSearch?.row;",
  "const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });\n    const data = await res.json();\n    const rows = data?.success ? [{ DATA_VALUE: String(data.rate), TIME: data.period?.replace('.','') }] : null;"
);

// 뉴스 fetch → /api/news
html = html.replace(
  "https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&count=10",
  "/api/news"
);
html = html.replace(
  "if (data.status === 'ok' && data.items?.length > 0) {",
  "if ((data.status === 'ok' || data.success) && data.items?.length > 0) {"
);

fs.writeFileSync('./index.html', html);
console.log('완료. 크기:', (html.length/1024).toFixed(0), 'KB');
