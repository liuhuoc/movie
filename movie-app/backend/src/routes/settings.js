const express = require('express');
const router = express.Router();
const { getCmsSources, getSettings, updateCmsSources, updateSettings } = require('../services/cmsAggregator');

// 获取所有设置
router.get('/', (req, res) => {
  try {
    const sources = getCmsSources();
    const settings = getSettings();
    res.json({
      success: true,
      data: {
        sources: sources.map(s => ({
          name: s.name,
          baseUrl: s.baseUrl,
          type: s.type,
          enabled: s.enabled
        })),
        settings
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 获取CMS源列表
router.get('/sources', (req, res) => {
  try {
    const sources = getCmsSources();
    res.json({
      success: true,
      data: sources.map(s => ({
        name: s.name,
        baseUrl: s.baseUrl,
        type: s.type,
        enabled: s.enabled
      }))
    });
  } catch (error) {
    res.status(500).json({ error: '获取源列表失败' });
  }
});

// 更新CMS源（全量替换）
router.post('/sources', (req, res) => {
  try {
    const { sources } = req.body;
    if (!Array.isArray(sources)) {
      return res.status(400).json({ error: 'sources必须是数组' });
    }
    
    // 验证每个源的格式
    for (const s of sources) {
      if (!s.name || !s.baseUrl) {
        return res.status(400).json({ error: '每个源必须包含name和baseUrl' });
      }
    }
    
    const success = updateCmsSources(sources);
    if (success) {
      res.json({ success: true, message: '源配置已更新' });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    res.status(500).json({ error: '更新源失败: ' + error.message });
  }
});

// 添加单个CMS源
router.post('/sources/add', (req, res) => {
  try {
    const { name, baseUrl, type = 'apple_cms', enabled = true } = req.body;
    if (!name || !baseUrl) {
      return res.status(400).json({ error: '缺少name或baseUrl' });
    }
    
    const sources = getCmsSources();
    // 检查是否已存在
    if (sources.find(s => s.name === name || s.baseUrl === baseUrl)) {
      return res.status(400).json({ error: '源已存在' });
    }
    
    sources.push({ name, baseUrl, type, enabled });
    const success = updateCmsSources(sources);
    if (success) {
      res.json({ success: true, message: '源已添加' });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    res.status(500).json({ error: '添加源失败: ' + error.message });
  }
});

// 删除CMS源
router.delete('/sources/:name', (req, res) => {
  try {
    const sources = getCmsSources();
    const filtered = sources.filter(s => s.name !== req.params.name);
    
    if (filtered.length === sources.length) {
      return res.status(404).json({ error: '源不存在' });
    }
    
    const success = updateCmsSources(filtered);
    if (success) {
      res.json({ success: true, message: '源已删除' });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    res.status(500).json({ error: '删除源失败: ' + error.message });
  }
});

// 切换源启用状态
router.post('/sources/:name/toggle', (req, res) => {
  try {
    const sources = getCmsSources();
    const source = sources.find(s => s.name === req.params.name);
    
    if (!source) {
      return res.status(404).json({ error: '源不存在' });
    }
    
    source.enabled = !source.enabled;
    const success = updateCmsSources(sources);
    if (success) {
      res.json({ success: true, enabled: source.enabled });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    res.status(500).json({ error: '切换状态失败: ' + error.message });
  }
});

// 获取应用设置
router.get('/app', (req, res) => {
  try {
    const settings = getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新应用设置
router.post('/app', (req, res) => {
  try {
    const settings = req.body;
    const success = updateSettings(settings);
    if (success) {
      res.json({ success: true, message: '设置已更新' });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    res.status(500).json({ error: '更新设置失败: ' + error.message });
  }
});

module.exports = router;
