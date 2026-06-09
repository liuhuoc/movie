const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PRECACHE_DIR = path.join(__dirname, '../../data/precache');
if (!fs.existsSync(PRECACHE_DIR)) fs.mkdirSync(PRECACHE_DIR, { recursive: true });

// 解析m3u8获取ts片段列表
async function parseM3u8(url) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const lines = res.data.split('\n');
    const segments = [];
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        const duration = parseFloat(line.replace('#EXTINF:', '').replace(',', '')) || 5;
        const segUrl = lines[i + 1]?.trim();
        if (segUrl) {
          segments.push({
            url: segUrl.startsWith('http') ? segUrl : baseUrl + segUrl,
            duration
          });
        }
      }
    }
    return segments;
  } catch (e) {
    console.error('解析m3u8失败:', e.message);
    return [];
  }
}

// 预缓存状态存储（内存）
const precacheStates = new Map();

// 开始预缓存
router.post('/start', async (req, res) => {
  try {
    const { url, movieId, currentSegment = 0 } = req.body;
    if (!url || !movieId) return res.status(400).json({ error: '缺少参数' });

    const segments = await parseM3u8(url);
    if (!segments.length) return res.status(400).json({ error: '无法解析m3u8' });

    const movieDir = path.join(PRECACHE_DIR, movieId);
    if (!fs.existsSync(movieDir)) fs.mkdirSync(movieDir, { recursive: true });

    // 预缓存后续30秒-1分钟的片段（约6-12个片段）
    const PRELOAD_COUNT = 10;
    const startIdx = currentSegment;
    const endIdx = Math.min(startIdx + PRELOAD_COUNT, segments.length);

    precacheStates.set(movieId, {
      total: segments.length,
      cached: 0,
      downloading: true,
      segments: segments.map((s, i) => ({ ...s, index: i, cached: false }))
    });

    // 异步下载
    (async () => {
      for (let i = startIdx; i < endIdx; i++) {
        const seg = segments[i];
        const fileName = `${String(i).padStart(5, '0')}.ts`;
        const filePath = path.join(movieDir, fileName);

        if (fs.existsSync(filePath)) {
          const state = precacheStates.get(movieId);
          if (state) state.segments[i].cached = true;
          continue;
        }

        try {
          const response = await axios.get(seg.url, {
            responseType: 'stream',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          const state = precacheStates.get(movieId);
          if (state) {
            state.cached++;
            state.segments[i].cached = true;
          }
        } catch (e) {
          console.error(`预缓存片段${i}失败:`, e.message);
        }
      }

      const state = precacheStates.get(movieId);
      if (state) state.downloading = false;
    })();

    res.json({
      success: true,
      message: '预缓存已启动',
      totalSegments: segments.length,
      preloadRange: `${startIdx}-${endIdx - 1}`
    });
  } catch (error) {
    res.status(500).json({ error: '预缓存启动失败' });
  }
});

// 获取预缓存状态
router.get('/status/:movieId', (req, res) => {
  const state = precacheStates.get(req.params.movieId);
  if (!state) return res.json({ success: true, downloading: false, cached: 0, total: 0 });
  res.json({
    success: true,
    downloading: state.downloading,
    cached: state.cached,
    total: state.total,
    progress: Math.round((state.cached / state.total) * 100)
  });
});

// 获取预缓存片段（供播放器使用）
router.get('/segment/:movieId/:index', (req, res) => {
  const { movieId, index } = req.params;
  const filePath = path.join(PRECACHE_DIR, movieId, `${String(index).padStart(5, '0')}.ts`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '片段未缓存' });
  }

  res.setHeader('Content-Type', 'video/mp2t');
  fs.createReadStream(filePath).pipe(res);
});

// 清理预缓存
router.delete('/:movieId', (req, res) => {
  const movieDir = path.join(PRECACHE_DIR, req.params.movieId);
  if (fs.existsSync(movieDir)) {
    fs.rmSync(movieDir, { recursive: true });
  }
  precacheStates.delete(req.params.movieId);
  res.json({ success: true });
});

module.exports = router;
