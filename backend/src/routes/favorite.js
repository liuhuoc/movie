const express = require('express');
const router = express.Router();
const { getMemoryStore, setMemoryStore } = require('../config/database');

const STORE_KEY = 'favorite';

function getFavoriteList() {
  return getMemoryStore().get(STORE_KEY) || [];
}

function setFavoriteList(list) {
  setMemoryStore(STORE_KEY, list);
}

// 获取收藏列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const list = getFavoriteList()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((parseInt(page) - 1) * parseInt(limit), page * limit);
    const total = getFavoriteList().length;
    res.json({ success: true, data: list, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ error: '获取收藏失败' });
  }
});

// 添加收藏
router.post('/', async (req, res) => {
  try {
    const { movieId, title, cover, year, type, rating } = req.body;
    if (!movieId || !title) return res.status(400).json({ error: '缺少参数' });

    const list = getFavoriteList();
    if (list.find(f => f.movieId === movieId)) {
      return res.json({ success: true, message: '已收藏' });
    }

    list.push({ movieId, title, cover, year, type, rating, createdAt: new Date() });
    setFavoriteList(list);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '收藏失败' });
  }
});

// 取消收藏
router.delete('/:movieId', async (req, res) => {
  try {
    const list = getFavoriteList().filter(f => f.movieId !== req.params.movieId);
    setFavoriteList(list);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '取消收藏失败' });
  }
});

// 检查是否已收藏
router.get('/check/:movieId', async (req, res) => {
  try {
    const existing = getFavoriteList().find(f => f.movieId === req.params.movieId);
    res.json({ success: true, isFavorite: !!existing });
  } catch (error) {
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
