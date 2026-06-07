// YouTube 부동산 채널 최신 영상 — 채널명 검색 방식
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: 'YouTube API 키 없음' });

  const channelNames = [
    '송희구 작가',
    '부동산읽어주는남자',
    '월급쟁이부자들TV',
    '슈카월드',
  ];

  // 채널명으로 검색해서 영상 가져오기
  async function getVideosByChannelName(name) {
    // 1단계: 채널 검색
    const searchUrl = `https://www.googleapis.com/youtube/v3/search`
      + `?key=${apiKey}`
      + `&q=${encodeURIComponent(name)}`
      + `&type=channel`
      + `&part=snippet`
      + `&maxResults=1`;

    const sr   = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    const sd   = await sr.json();
    if (sd.error) throw new Error(sd.error.message);

    const channelId = sd.items?.[0]?.id?.channelId;
    const channelTitle = sd.items?.[0]?.snippet?.title || name;
    if (!channelId) return { channel: name, videos: [] };

    // 2단계: 해당 채널 최신 영상 가져오기
    const videoUrl = `https://www.googleapis.com/youtube/v3/search`
      + `?key=${apiKey}`
      + `&channelId=${channelId}`
      + `&part=snippet`
      + `&order=date`
      + `&maxResults=3`
      + `&type=video`;

    const vr   = await fetch(videoUrl, { signal: AbortSignal.timeout(8000) });
    const vd   = await vr.json();
    if (vd.error) throw new Error(vd.error.message);

    const videos = (vd.items || []).map(item => ({
      id:          item.id.videoId,
      title:       item.snippet.title,
      thumbnail:   item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      channel:     channelTitle,
      url:         `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return { channel: channelTitle, videos };
  }

  try {
    const results = await Promise.allSettled(
      channelNames.map(name => getVideosByChannelName(name))
    );

    const channels = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const allVideos = channels
      .flatMap(c => c.videos)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return res.status(200).json({
      success: true,
      channels,
      allVideos,
      count: allVideos.length,
    });

  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
