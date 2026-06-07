// Claude API로 부동산 시장 찬반 분석 생성
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  const apiKey       = process.env.ANTHROPIC_API_KEY;
  const naverId      = process.env.NAVER_CLIENT_ID;
  const naverSecret  = process.env.NAVER_CLIENT_SECRET;

  if (!apiKey) return res.status(500).json({ success: false, message: 'Claude API 키 없음' });

  try {
    // 1. 최신 부동산 뉴스 가져오기
    let newsContext = '';
    if (naverId && naverSecret) {
      try {
        const query = encodeURIComponent('서울 부동산 아파트 집값 2026');
        const nr = await fetch(
          `https://openapi.naver.com/v1/search/news.json?query=${query}&display=10&sort=date`,
          { headers: { 'X-Naver-Client-Id': naverId, 'X-Naver-Client-Secret': naverSecret } }
        );
        const nd = await nr.json();
        if (nd.items?.length) {
          newsContext = nd.items
            .map(i => i.title.replace(/<\/?b>/g, '').replace(/&quot;/g,'"').replace(/&amp;/g,'&'))
            .join('\n');
        }
      } catch {}
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월`;

    // 2. Claude에게 분석 요청
    const prompt = `당신은 한국 부동산 시장 전문 애널리스트입니다.

현재 날짜: ${dateStr}
한국은행 기준금리: 1% (2026년 3월 기준)

${newsContext ? `최신 뉴스 헤드라인:\n${newsContext}\n` : ''}

위 정보를 바탕으로 "${dateStr} 현재 서울 아파트를 지금 사야 할까요?" 에 대한 찬반 분석을 해주세요.

반드시 아래 JSON 형식으로만 답변하세요. 다른 텍스트 없이 JSON만:
{
  "pros": [
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"}
  ],
  "cons": [
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"},
    {"title": "제목", "desc": "설명 (1~2문장)"}
  ],
  "verdict": "종합 판단 (3~4문장. 실거주 목적 기준으로 현실적인 조언)"
}`;

    const claude = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!claude.ok) {
      const err = await claude.text();
      return res.status(200).json({ success: false, message: `Claude 오류: ${claude.status}` });
    }

    const claudeData = await claude.json();
    const text = claudeData.content?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ success: false, message: '분석 파싱 실패' });

    const analysis = JSON.parse(jsonMatch[0]);
    return res.status(200).json({
      success: true,
      analysis,
      date: dateStr,
      generatedAt: new Date().toISOString(),
    });

  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
