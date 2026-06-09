const express = require('express');
const router = express.Router();
const { getMemoryStore, setMemoryStore } = require('../config/database');

const STORE_KEY = 'history';

function getHistoryList() {
  return getMemoryStore().get(STORE_KEY) || [];
}

function setHistoryList(list) {
  setMemoryStore(STORE_KEY, list);
}

// 获取观看历史
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const list = getHistoryList()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice((parseInt(page) - 1) * parseInt(limit), page * limit);
    const total = getHistoryList().length;
    res.json({ success: true, data: list, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ error: '获取历史失败' });
  }
});

// 记录/更新观看进度
router.post('/', async (req, res) => {
  try {
    const { movieId, title, cover, episodeName, progress, duration, sourceName, sources, activeSource, activeEpisode } = req.body;
    if (!movieId) return res.status(400).json({ error: '缺少movieId' });

    const list = getHistoryList();
    const idx = list.findIndex(h => h.movieId === movieId);
    const item = {
      _id: movieId,
      movieId,
      title,
      cover,
      episodeName,
      progress,
      duration,
      sourceName,
      sources: sources || [],
      activeSource: activeSource || 0,
      activeEpisode: activeEpisode || 0,
      updatedAt: new Date()
    };

    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    setHistoryList(list);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '记录历史失败' });
  }
});

// 删除单条历史
router.delete('/:id', async (req, res) => {
  try {
    const list = getHistoryList().filter(h => h._id !== req.params.id && h.movieId !== req.params.id);
    setHistoryList(list);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 清空历史
router.delete('/', async (req, res) => {
  try {
    setHistoryList([]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '清空失败' });
  }
});

module.exports = router;
