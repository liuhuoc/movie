const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    const user = new User({
      username,
      password,
      nickname: nickname || username
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          settings: user.settings
        }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('history.movieId', 'title cover type')
      .populate('favorites.movieId', 'title cover type');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatar, settings } = req.body;
    const updateData = {};
    
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;
    if (settings) updateData.settings = { ...req.user.settings, ...settings };
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 添加观看历史
router.post('/history', auth, async (req, res) => {
  try {
    const { movieId, title, cover, episode, progress, duration } = req.body;
    
    const user = await User.findById(req.userId);
    
    // 查找是否已有记录
    const historyIndex = user.history.findIndex(
      h => h.movieId.toString() === movieId
    );
    
    if (historyIndex >= 0) {
      // 更新现有记录
      user.history[historyIndex] = {
        movieId,
        title,
        cover,
        episode,
        progress,
        duration,
        updatedAt: new Date()
      };
    } else {
      // 添加新记录
      user.history.unshift({
        movieId,
        title,
        cover,
        episode,
        progress,
        duration
      });
    }
    
    // 限制历史记录数量
    if (user.history.length > 100) {
      user.history = user.history.slice(0, 100);
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: user.history
    });
  } catch (error) {
    console.error('添加观看历史失败:', error);
    res.status(500).json({ error: '添加观看历史失败' });
  }
});

// 添加/移除收藏
router.post('/favorite', auth, async (req, res) => {
  try {
    const { movieId } = req.body;
    
    const user = await User.findById(req.userId);
    const favoriteIndex = user.favorites.findIndex(
      f => f.movieId.toString() === movieId
    );
    
    if (favoriteIndex >= 0) {
      // 移除收藏
      user.favorites.splice(favoriteIndex, 1);
    } else {
      // 添加收藏
      user.favorites.unshift({ movieId });
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    console.error('操作收藏失败:', error);
    res.status(500).json({ error: '操作收藏失败' });
  }
});

module.exports = router;
