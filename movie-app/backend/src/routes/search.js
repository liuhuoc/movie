const express = require('express');
const router = express.Router();
const { aggregateSearch, getMovieDetail, getHotRecommendations, CMS_SOURCES } = require('../services/cmsAggregator');
const { getRedis } = require('../config/redis');

const CACHE_TTL = 3600; // 缓存1小时

// 搜索处理函数（GET和POST共用）
async function handleSearch(req, res) {
  try {
    const q = req.query.q || req.body?.q;
    const page = req.query.page || req.body?.page || 1;
    const limit = req.query.limit || req.body?.limit || 20;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    const keyword = q.trim();
    const cacheKey = `search:${keyword}`;
    
    // 先查缓存
    try {
      const redis = getRedis();
      if (redis && redis.isReady) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          console.log(`[聚合搜索] 命中缓存: ${keyword}`);
          const pageNum = parseInt(page);
          const limitNum = parseInt(limit);
          const allResults = data.allResults || data.data || [];
          return res.json({
            success: true,
            data: allResults.slice((pageNum - 1) * limitNum, pageNum * limitNum),
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: allResults.length,
              pages: Math.ceil(allResults.length / limitNum)
            },
            sources: data.sources || []
          });
        }
      }
    } catch (e) {
      console.log('缓存读取失败，继续搜索:', e.message);
    }
    
    console.log(`[聚合搜索] 关键词: ${keyword}`);
    const startTime = Date.now();
    
    const results = await aggregateSearch(keyword);
    
    console.log(`[聚合搜索] 找到 ${results.length} 个结果，耗时 ${Date.now() - startTime}ms`);
    
    // 写入缓存
    try {
      const redis = getRedis();
      if (redis && redis.isReady) {
        await redis.set(cacheKey, JSON.stringify({ allResults: results, sources: CMS_SOURCES.filter(s => s.enabled).map(s => s.name) }), { EX: CACHE_TTL });
        console.log(`[聚合搜索] 已缓存: ${keyword}`);
      }
    } catch (e) {
      console.log('缓存写入失败:', e.message);
    }
    
    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: results.length,
        pages: Math.ceil(results.length / limitNum)
      },
      sources: CMS_SOURCES.filter(s => s.enabled).map(s => s.name)
    });
  } catch (error) {
    console.error('聚合搜索失败:', error);
    res.status(500).json({ error: '搜索失败: ' + error.message });
  }
}

router.get('/', handleSearch);
router.post('/', handleSearch);

// 获取CMS源列表
router.get('/sources', (req, res) => {
  res.json({
    success: true,
    data: CMS_SOURCES.map(s => ({
      name: s.name,
      type: s.type,
      enabled: s.enabled
    }))
  });
});

// 获取热门推荐
router.get('/hot', async (req, res) => {
  try {
    const { type = '', limit = 12 } = req.query;
    console.log(`[热门推荐] 获取热门影片, type=${type}, limit=${limit}`);
    const startTime = Date.now();
    
    const results = await getHotRecommendations(type, parseInt(limit));
    
    console.log(`[热门推荐] 找到 ${results.length} 个影片，耗时 ${Date.now() - startTime}ms`);
    res.json({
      success: true,
      data: results,
      sources: CMS_SOURCES.filter(s => s.enabled).map(s => s.name)
    });
  } catch (error) {
    console.error('获取热门推荐失败:', error);
    res.status(500).json({ error: '获取热门推荐失败: ' + error.message });
  }
});

// 从指定源获取影片详情和播放地址
router.get('/detail', async (req, res) => {
  try {
    const { sourceUrl, vodId } = req.query;
    
    if (!sourceUrl || !vodId) {
      return res.status(400).json({ error: '缺少 sourceUrl 或 vodId 参数' });
    }
    
    const detail = await getMovieDetail(sourceUrl, vodId);
    
    if (!detail) {
      return res.status(404).json({ error: '影片不存在或源已失效' });
    }
    
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    console.error('获取详情失败:', error);
    res.status(500).json({ error: '获取详情失败: ' + error.message });
  }
});

module.exports = router;
