const express = require('express');
const router = express.Router();
const Danmaku = require('../models/Danmaku');
const { optionalAuth } = require('../middleware/auth');

// 获取弹幕列表
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { startTime, endTime, limit = 100 } = req.query;
    
    const query = { videoId, status: 'approved' };
    
    if (startTime && endTime) {
      query.time = {
        $gte: parseFloat(startTime),
        $lte: parseFloat(endTime)
      };
    }
    
    const danmakuList = await Danmaku.find(query)
      .sort({ time: 1 })
      .limit(parseInt(limit))
      .select('text time color type size username likes');
    
    res.json({
      success: true,
      data: danmakuList
    });
  } catch (error) {
    console.error('获取弹幕失败:', error);
    res.status(500).json({ error: '获取弹幕失败' });
  }
});

// 发送弹幕
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { videoId, text, time, color, type, size } = req.body;
    
    if (!videoId || !text || time === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    if (text.length > 100) {
      return res.status(400).json({ error: '弹幕内容过长' });
    }
    
    const danmaku = new Danmaku({
      videoId,
      userId: req.userId,
      username: req.user?.nickname || req.user?.username || '匿名用户',
      text,
      time: parseFloat(time),
      color: color || '#FFFFFF',
      type: type || 'scroll',
      size: size || 1.0
    });
    
    await danmaku.save();
    
    res.json({
      success: true,
      data: danmaku
    });
  } catch (error) {
    console.error('发送弹幕失败:', error);
    res.status(500).json({ error: '发送弹幕失败' });
  }
});

// 点赞弹幕
router.post('/:id/like', async (req, res) => {
  try {
    const danmaku = await Danmaku.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    
    if (!danmaku) {
      return res.status(404).json({ error: '弹幕不存在' });
    }
    
    res.json({
      success: true,
      data: danmaku
    });
  } catch (error) {
    console.error('点赞弹幕失败:', error);
    res.status(500).json({ error: '点赞弹幕失败' });
  }
});

module.exports = router;
