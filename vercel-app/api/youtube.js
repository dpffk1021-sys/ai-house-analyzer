// YouTube 부동산 채널 최신 영상 가져오기
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: 'YouTube API 키 없음' });

  // 채널 ID 목록 (송희구 작가, 부읽남, 월급쟁이부자들)
  const channels = [
    { name: '송희구 작가',          id: 'UCp6BwrSSNkO5aoL8mFLksjw' },
    { name: '부동산 읽어주는 남자', id: 'UCdnx30mkTkPgUBkDfqDNvpA' },
    { name: '월급쟁이부자들 TV',    id: 'UCi3H6jCR4oKVlQGNGTYRR8g' },
    { name: '슈카월드',             id: 'UCsJ6RiAMvMJwmBAfN0dMlSQ' },
  ];

  try {
    const results = await Promise.allSettled(
      channels.map(async (ch) => {
        const url = `https://www.googleapis.com/youtube/v3/search`
          + `?key=${apiKey}`
          + `&channelId=${ch.id}`
          + `&part=snippet`
          + `&order=date`
          + `&maxResults=3`
          + `&type=video`;

        const r    = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await r.json();

        if (data.error) throw new Error(data.error.message);

        const videos = (data.items || []).map(item => ({
          id:        item.id.videoId,
          title:     item.snippet.title,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          publishedAt: item.snippet.publishedAt,
          channel:   ch.name,
          url:       `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }));

        return { channel: ch.name, videos };
      })
    );

    const channels_data = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    // 전체 영상 최신순 정렬
    const allVideos = channels_data
      .flatMap(c => c.videos)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return res.status(200).json({
      success: true,
      channels: channels_data,
      allVideos,
      count: allVideos.length,
    });

  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
