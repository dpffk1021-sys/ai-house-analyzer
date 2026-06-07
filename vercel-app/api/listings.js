// 국토교통부 아파트 실거래가 API 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const apiKey  = process.env.MOLIT_API_KEY;
  const lawdCd  = req.query.lawd  || '11620'; // 관악구 기본값
  const dealYmd = req.query.month || (() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'API 키가 설정되지 않았습니다.' });
  }

  try {
    const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade`
      + `?serviceKey=${encodeURIComponent(apiKey)}`
      + `&LAWD_CD=${lawdCd}`
      + `&DEAL_YMD=${dealYmd}`
      + `&numOfRows=30`
      + `&pageNo=1`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/xml, text/xml' },
    });
    const xml = await response.text();

    // XML 파싱
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}\\s*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim() : '';
      };

      const name    = get('아파트');
      const price   = get('거래금액').replace(/,/g, '').trim();
      const area    = get('전용면적');
      const floor   = get('층');
      const year    = get('건축년도');
      const dong    = get('법정동');
      const dealDay = `${get('년')}.${get('월').padStart(2,'0')}.${get('일').padStart(2,'0')}`;
      const jibun   = get('지번');

      if (name) {
        items.push({
          name,
          price: parseInt(price.replace(/\s/g, ''), 10) || 0,
          priceStr: price.replace(/\s/g, '') + '만',
          area: parseFloat(area).toFixed(1),
          floor,
          year,
          dong,
          dealDay,
          jibun,
          pyeong: Math.round(parseFloat(area) / 3.3),
        });
      }
    }

    // 가격 내림차순 정렬
    items.sort((a, b) => b.price - a.price);

    // 오류 체크
    const resultCode = xml.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
    if (resultCode && resultCode !== '00') {
      const resultMsg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] || '오류';
      return res.status(200).json({ success: false, message: resultMsg, code: resultCode });
    }

    return res.status(200).json({
      success: true,
      items,
      count: items.length,
      lawdCd,
      dealYmd,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
