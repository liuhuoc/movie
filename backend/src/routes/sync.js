const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// 获取播放进度
router.get('/progress/:movieId', auth, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const user = await User.findById(req.userId);
    const historyItem = user.history.find(
      h => h.movieId.toString() === movieId
    );
    
    if (!historyItem) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: {
        movieId,
        episode: historyItem.episode,
        progress: historyItem.progress,
        duration: historyItem.duration,
        updatedAt: historyItem.updatedAt
      }
    });
  } catch (error) {
    console.error('获取播放进度失败:', error);
    res.status(500).json({ error: '获取播放进度失败' });
  }
});

// 同步播放进度
router.post('/progress', auth, async (req, res) => {
  try {
    const { movieId, title, cover, episode, progress, duration } = req.body;
    
    const user = await User.findById(req.userId);
    
    const historyIndex = user.history.findIndex(
      h => h.movieId.toString() === movieId
    );
    
    if (historyIndex >= 0) {
      user.history[historyIndex] = {
        movieId,
        title,
        cover,
        episode: episode || 1,
        progress: progress || 0,
        duration: duration || 0,
        updatedAt: new Date()
      };
    } else {
      user.history.unshift({
        movieId,
        title,
        cover,
        episode: episode || 1,
        progress: progress || 0,
        duration: duration || 0
      });
    }
    
    if (user.history.length > 100) {
      user.history = user.history.slice(0, 100);
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        movieId,
        episode,
        progress,
        duration
      }
    });
  } catch (error) {
    console.error('同步播放进度失败:', error);
    res.status(500).json({ error: '同步播放进度失败' });
  }
});

// 批量获取播放进度
router.post('/progress/batch', auth, async (req, res) => {
  try {
    const { movieIds } = req.body;
    
    if (!Array.isArray(movieIds)) {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const user = await User.findById(req.userId);
    
    const progressMap = {};
    user.history.forEach(h => {
      if (movieIds.includes(h.movieId.toString())) {
        progressMap[h.movieId.toString()] = {
          episode: h.episode,
          progress: h.progress,
          duration: h.duration
        };
      }
    });
    
    res.json({
      success: true,
      data: progressMap
    });
  } catch (error) {
    console.error('批量获取播放进度失败:', error);
    res.status(500).json({ error: '批量获取播放进度失败' });
  }
});

// 获取用户配置
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    
    res.json({
      success: true,
      data: user.settings
    });
  } catch (error) {
    console.error('获取用户配置失败:', error);
    res.status(500).json({ error: '获取用户配置失败' });
  }
});

// 同步用户配置
router.post('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    const user = await User.findById(req.userId);
    user.settings = { ...user.settings, ...settings };
    await user.save();
    
    res.json({
      success: true,
      data: user.settings
    });
  } catch (error) {
    console.error('同步用户配置失败:', error);
    res.status(500).json({ error: '同步用户配置失败' });
  }
});

module.exports = router;
