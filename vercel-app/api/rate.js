// 한국은행 기준금리 API 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const now  = new Date();
    const ym   = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = `${now.getFullYear()}${String(Math.max(1, now.getMonth() - 2)).padStart(2, '0')}`;
    const url  = `https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/5/722Y001/M/${prev}/${ym}`;

    const response = await fetch(url);
    const data     = await response.json();
    const rows     = data?.StatisticSearch?.row;

    if (!rows?.length) {
      return res.status(200).json({ success: false, message: '데이터 없음' });
    }

    const latest = rows[rows.length - 1];
    const rate   = parseFloat(latest.DATA_VALUE);
    const period = latest.TIME?.replace(/(\d{4})(\d{2})/, '$1.$2');

    return res.status(200).json({
      success: true,
      rate,
      period,
      source: '한국은행 ECOS',
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
