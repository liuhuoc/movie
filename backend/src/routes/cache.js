const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getMemoryStore, setMemoryStore } = require('../config/database');

// 缓存存储目录
const CACHE_DIR = path.join(__dirname, '../../data/cache');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const CACHE_STORE_KEY = 'cache';

function getCacheList() {
  return getMemoryStore().get(CACHE_STORE_KEY) || [];
}

function setCacheList(list) {
  setMemoryStore(CACHE_STORE_KEY, list);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 解析m3u8，提取所有ts片段URL
function parseM3u8(m3u8Text, baseUrl) {
  const segments = [];
  const lines = m3u8Text.split('\n').map(l => l.trim()).filter(l => l);
  let currentDuration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([\d.]+)/);
      if (match) currentDuration = parseFloat(match[1]);
    } else if (!line.startsWith('#') && line.endsWith('.ts')) {
      // 处理相对URL
      let tsUrl = line;
      if (!tsUrl.startsWith('http')) {
        const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        tsUrl = base + tsUrl;
      }
      segments.push({ duration: currentDuration, url: tsUrl });
      currentDuration = 0;
    }
  }
  return segments;
}

// 下载单个ts片段
async function downloadSegment(url, retry = 2) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': url
      }
    });
    return Buffer.from(res.data);
  } catch (err) {
    if (retry > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return downloadSegment(url, retry - 1);
    }
    throw err;
  }
}

// ==================== 路由 ====================

router.post('/download', async (req, res) => {
  try {
    const { url, title, cover, episodeName } = req.body;
    if (!url || !title) {
      return res.status(400).json({ error: '缺少必要参数: url, title' });
    }

    const id = generateId();
    const cacheItem = {
      _id: id,
      title,
      cover: cover || '',
      episodeName: episodeName || '',
      url,
      fileSize: 0,
      status: 'downloading',
      progress: 0,
      totalSegments: 0,
      downloadedSegments: 0,
      createdAt: new Date()
    };

    const list = getCacheList();
    list.push(cacheItem);
    setCacheList(list);

    // 异步下载完整视频
    downloadFullVideo(url, id, cacheItem).catch(err => {
      console.error(`下载失败 [${id}]:`, err.message);
    });

    res.json({ success: true, data: { id, title, status: 'downloading' } });
  } catch (error) {
    console.error('创建下载任务失败:', error);
    res.status(500).json({ error: '创建下载任务失败' });
  }
});

async function downloadFullVideo(m3u8Url, id, cacheItem) {
  const filePath = path.join(CACHE_DIR, `${id}.mp4`);
  const tempDir = path.join(CACHE_DIR, `tmp_${id}`);

  try {
    // 1. 下载m3u8文件
    const m3u8Res = await axios.get(m3u8Url, {
      timeout: 30000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': m3u8Url
      }
    });

    // 2. 解析ts片段
    const segments = parseM3u8(m3u8Res.data, m3u8Url);
    if (segments.length === 0) {
      throw new Error('未找到ts片段');
    }

    cacheItem.totalSegments = segments.length;
    setCacheList(getCacheList());

    // 3. 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 4. 下载所有ts片段
    const segmentFiles = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segPath = path.join(tempDir, `seg_${String(i).padStart(5, '0')}.ts`);

      try {
        const data = await downloadSegment(seg.url);
        fs.writeFileSync(segPath, data);
        segmentFiles.push(segPath);

        cacheItem.downloadedSegments = i + 1;
        cacheItem.progress = Math.round(((i + 1) / segments.length) * 100);
        setCacheList(getCacheList());
      } catch (err) {
        console.error(`下载片段失败 [${i}]: ${seg.url}`, err.message);
        // 继续下载其他片段
      }
    }

    if (segmentFiles.length === 0) {
      throw new Error('所有片段下载失败');
    }

    // 5. 合并ts片段为mp4
    await mergeTsToMp4(segmentFiles, filePath);

    // 6. 清理临时文件
    segmentFiles.forEach(f => {
      try { fs.unlinkSync(f); } catch (e) {}
    });
    try { fs.rmdirSync(tempDir); } catch (e) {}

    // 7. 更新状态
    const stats = fs.statSync(filePath);
    cacheItem.fileSize = stats.size;
    cacheItem.status = 'ready';
    cacheItem.progress = 100;
    setCacheList(getCacheList());

    console.log(`下载完成 [${id}]: ${cacheItem.title}, 大小: ${(stats.size / 1024 / 1024).toFixed(2)}MB, 片段: ${segmentFiles.length}/${segments.length}`);
  } catch (error) {
    console.error(`下载出错 [${id}]:`, error.message);
    // 清理临时文件
    try {
      if (fs.existsSync(tempDir)) {
        fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f)));
        fs.rmdirSync(tempDir);
      }
    } catch (e) {}
    cacheItem.status = 'error';
    setCacheList(getCacheList());
  }
}

// 使用ffmpeg合并ts片段（如果可用），否则直接拼接
async function mergeTsToMp4(segmentFiles, outputPath) {
  // 先尝试使用ffmpeg
  const { execSync } = require('child_process');
  const concatList = path.join(path.dirname(outputPath), `list_${Date.now()}.txt`);

  try {
    // 创建ffmpeg concat列表文件
    const listContent = segmentFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatList, listContent);

    execSync(`ffmpeg -f concat -safe 0 -i "${concatList}" -c copy -bsf:a aac_adtstoasc -movflags +faststart "${outputPath}" -y`, {
      timeout: 300000,
      stdio: 'ignore'
    });

    fs.unlinkSync(concatList);
    return;
  } catch (e) {
    // ffmpeg不可用，直接二进制拼接
    try { if (fs.existsSync(concatList)) fs.unlinkSync(concatList); } catch (e2) {}

    const writeStream = fs.createWriteStream(outputPath);
    for (const segFile of segmentFiles) {
      const data = fs.readFileSync(segFile);
      writeStream.write(data);
    }
    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }
}

router.get('/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let items = getCacheList();
    if (status) items = items.filter(i => i.status === status);

    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = items.slice(start, start + parseInt(limit));
    const total = items.length;

    res.json({
      success: true,
      data: paginated,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('获取缓存列表失败:', error);
    res.status(500).json({ error: '获取缓存列表失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const list = getCacheList();
    const item = list.find(i => i._id === req.params.id);
    if (!item) return res.status(404).json({ error: '缓存记录不存在' });

    // 删除mp4文件和临时目录
    const mp4Path = path.join(CACHE_DIR, `${item._id}.mp4`);
    const tempDir = path.join(CACHE_DIR, `tmp_${item._id}`);
    try { if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path); } catch (e) {}
    try {
      if (fs.existsSync(tempDir)) {
        fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f)));
        fs.rmdirSync(tempDir);
      }
    } catch (e) {}

    setCacheList(list.filter(i => i._id !== req.params.id));
    res.json({ success: true, message: '缓存已删除' });
  } catch (error) {
    console.error('删除缓存失败:', error);
    res.status(500).json({ error: '删除缓存失败' });
  }
});

router.get('/stream/:id', async (req, res) => {
  try {
    const list = getCacheList();
    const cacheItem = list.find(i => i._id === req.params.id);
    if (!cacheItem) return res.status(404).json({ error: '缓存记录不存在' });
    if (cacheItem.status !== 'ready') return res.status(400).json({ error: `缓存文件未就绪，当前状态: ${cacheItem.status}` });

    const filePath = path.join(CACHE_DIR, `${cacheItem._id}.mp4`);
    if (!fs.existsSync(filePath)) {
      cacheItem.status = 'error';
      setCacheList(list);
      return res.status(404).json({ error: '缓存文件不存在' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('流式播放失败:', error);
    res.status(500).json({ error: '流式播放失败' });
  }
});

router.post('/detect-ads', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: '缺少必要参数: url' });

    const response = await axios.get(url, { timeout: 30000, responseType: 'text' });
    const m3u8Text = response.data;
    const segments = parseM3u8(m3u8Text, url);

    if (segments.length === 0) {
      return res.json({ success: true, data: { segments: [], totalSegments: 0, message: '未找到有效的 TS 片段' } });
    }

    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

    res.json({
      success: true,
      data: {
        totalSegments: segments.length,
        totalDuration: Math.round(totalDuration * 100) / 100,
      }
    });
  } catch (error) {
    console.error('广告检测失败:', error);
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: '获取 m3u8 文件超时' });
    }
    res.status(500).json({ error: '广告检测失败' });
  }
});

module.exports = router;
