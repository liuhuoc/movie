const express = require('express');
const router = express.Router();
const { getMemoryStore, setMemoryStore } = require('../config/database');

const MOVIES_KEY = 'movies';
const DEMO_MOVIES = [
  { _id: '1', title: '三体', cover: '', year: 2023, rating: 9.2, type: '电视剧', category: ['科幻', '悬疑'], area: '中国大陆', status: '已完结', totalEpisodes: 30, currentEpisode: 30, spiderUpdatedAt: new Date() },
  { _id: '2', title: '狂飙', cover: '', year: 2023, rating: 8.8, type: '电视剧', category: ['犯罪', '剧情'], area: '中国大陆', status: '已完结', totalEpisodes: 39, currentEpisode: 39, spiderUpdatedAt: new Date() },
  { _id: '3', title: '流浪地球2', cover: '', year: 2023, rating: 9.0, type: '电影', category: ['科幻', '灾难'], area: '中国大陆', status: '已完结', totalEpisodes: 1, currentEpisode: 1, spiderUpdatedAt: new Date() },
  { _id: '4', title: '奥本海默', cover: '', year: 2023, rating: 8.9, type: '电影', category: ['传记', '历史'], area: '美国', status: '已完结', totalEpisodes: 1, currentEpisode: 1, spiderUpdatedAt: new Date() },
  { _id: '5', title: '繁花', cover: '', year: 2024, rating: 8.7, type: '电视剧', category: ['剧情', '爱情'], area: '中国大陆', status: '已完结', totalEpisodes: 30, currentEpisode: 30, spiderUpdatedAt: new Date() },
  { _id: '6', title: '漫长的季节', cover: '', year: 2023, rating: 9.4, type: '电视剧', category: ['悬疑', '犯罪'], area: '中国大陆', status: '已完结', totalEpisodes: 12, currentEpisode: 12, spiderUpdatedAt: new Date() },
  { _id: '7', title: '铃芽之旅', cover: '', year: 2023, rating: 8.2, type: '电影', category: ['动画', '奇幻'], area: '日本', status: '已完结', totalEpisodes: 1, currentEpisode: 1, spiderUpdatedAt: new Date() },
  { _id: '8', title: '灌篮高手', cover: '', year: 2023, rating: 8.5, type: '电影', category: ['动画', '运动'], area: '日本', status: '已完结', totalEpisodes: 1, currentEpisode: 1, spiderUpdatedAt: new Date() },
  { _id: '9', title: '庆余年2', cover: '', year: 2024, rating: 8.0, type: '电视剧', category: ['古装', '剧情'], area: '中国大陆', status: '连载中', totalEpisodes: 36, currentEpisode: 36, spiderUpdatedAt: new Date() },
  { _id: '10', title: '与凤行', cover: '', year: 2024, rating: 7.5, type: '电视剧', category: ['古装', '爱情'], area: '中国大陆', status: '已完结', totalEpisodes: 39, currentEpisode: 39, spiderUpdatedAt: new Date() },
];

function getMovies() {
  const store = getMemoryStore();
  if (!store.get(MOVIES_KEY)) {
    store.set(MOVIES_KEY, DEMO_MOVIES);
  }
  return store.get(MOVIES_KEY);
}

// 获取分类列表
router.get('/categories/list', async (req, res) => {
  try {
    const movies = getMovies();
    const categories = [...new Set(movies.flatMap(m => m.category || []))];
    const areas = [...new Set(movies.map(m => m.area).filter(Boolean))];
    const years = [...new Set(movies.map(m => m.year).filter(Boolean))].sort((a, b) => b - a);
    res.json({ success: true, data: { categories, areas, years: years.slice(0, 30) } });
  } catch (error) {
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 获取推荐影片
router.get('/recommend/list', async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    let movies = getMovies();
    if (type) movies = movies.filter(m => m.type === type);
    movies = movies.sort((a, b) => b.rating - a.rating).slice(0, parseInt(limit));
    res.json({ success: true, data: movies.map(m => ({ title: m.title, cover: m.cover, year: m.year, rating: m.rating, type: m.type })) });
  } catch (error) {
    res.status(500).json({ error: '获取推荐影片失败' });
  }
});

// 搜索影片
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.trim().length === 0) return res.status(400).json({ error: '搜索关键词不能为空' });
    const keyword = q.trim().toLowerCase();
    const movies = getMovies().filter(m =>
      m.title.toLowerCase().includes(keyword) ||
      (m.category || []).some(c => c.toLowerCase().includes(keyword))
    );
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = movies.slice(start, start + parseInt(limit));
    res.json({ success: true, data: paginated, pagination: { page: parseInt(page), limit: parseInt(limit), total: movies.length, pages: Math.ceil(movies.length / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ error: '搜索影片失败' });
  }
});

// 获取影片列表
router.get('/', async (req, res) => {
  try {
    const { type, category, year, area, status, sort = 'updatedAt', order = 'desc', page = 1, limit = 20, keyword } = req.query;
    let movies = getMovies();
    if (type) movies = movies.filter(m => m.type === type);
    if (category) movies = movies.filter(m => (m.category || []).includes(category));
    if (year) movies = movies.filter(m => m.year === parseInt(year));
    if (area) movies = movies.filter(m => m.area === area);
    if (status) movies = movies.filter(m => m.status === status);
    if (keyword) movies = movies.filter(m => m.title.toLowerCase().includes(keyword.toLowerCase()));
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = movies.slice(start, start + parseInt(limit));
    res.json({ success: true, data: paginated, pagination: { page: parseInt(page), limit: parseInt(limit), total: movies.length, pages: Math.ceil(movies.length / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ error: '获取影片列表失败' });
  }
});

// 获取影片详情
router.get('/:id', async (req, res) => {
  try {
    const movie = getMovies().find(m => m._id === req.params.id);
    if (!movie) return res.status(404).json({ error: '影片不存在' });
    res.json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ error: '获取影片详情失败' });
  }
});

module.exports = router;
