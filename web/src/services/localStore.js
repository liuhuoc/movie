/**
 * 本地存储服务
 * 替代 MongoDB，使用 localStorage 实现数据的持久化存储
 * 包含观看历史、收藏、弹幕、播放设置、运行模式等功能
 */

// ==================== 观看历史 ====================

/**
 * 获取观看历史列表
 * @returns {Array} 历史记录数组，按更新时间降序排列
 */
export function getHistory() {
  try {
    const stored = localStorage.getItem('watchHistory');
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('读取观看历史失败:', e.message);
    return [];
  }
}

/**
 * 保存（新增或更新）观看历史
 * 如果相同 movieId 已存在则更新，否则新增
 * @param {Object} item - 历史记录项，需包含 movieId 字段
 */
export function saveHistory(item) {
  try {
    const history = getHistory();
    // 查找是否已存在相同 movieId 的记录
    const index = history.findIndex(h => h.movieId === item.movieId);
    if (index >= 0) {
      // 更新已有记录
      history[index] = { ...history[index], ...item, updatedAt: Date.now() };
    } else {
      // 新增记录
      history.unshift({ ...item, updatedAt: Date.now() });
    }
    localStorage.setItem('watchHistory', JSON.stringify(history));
  } catch (e) {
    console.error('保存观看历史失败:', e.message);
  }
}

/**
 * 删除指定影片的观看历史
 * @param {string|number} movieId - 影片 ID
 */
export function deleteHistory(movieId) {
  try {
    const history = getHistory();
    const filtered = history.filter(h => h.movieId !== movieId);
    localStorage.setItem('watchHistory', JSON.stringify(filtered));
  } catch (e) {
    console.error('删除观看历史失败:', e.message);
  }
}

/**
 * 清空所有观看历史
 */
export function clearHistory() {
  try {
    localStorage.removeItem('watchHistory');
  } catch (e) {
    console.error('清空观看历史失败:', e.message);
  }
}

// ==================== 收藏 ====================

/**
 * 获取收藏列表
 * @returns {Array} 收藏数组
 */
export function getFavorites() {
  try {
    const stored = localStorage.getItem('favorites');
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('读取收藏列表失败:', e.message);
    return [];
  }
}

/**
 * 添加收藏（自动去重）
 * 如果已收藏相同 movieId 的影片则忽略
 * @param {Object} item - 收藏项，需包含 movieId 字段
 */
export function addFavorite(item) {
  try {
    const favorites = getFavorites();
    // 去重检查
    if (favorites.some(f => f.movieId === item.movieId)) {
      return; // 已收藏，跳过
    }
    favorites.unshift({ ...item, favoritedAt: Date.now() });
    localStorage.setItem('favorites', JSON.stringify(favorites));
  } catch (e) {
    console.error('添加收藏失败:', e.message);
  }
}

/**
 * 取消收藏
 * @param {string|number} movieId - 影片 ID
 */
export function removeFavorite(movieId) {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(f => f.movieId !== movieId);
    localStorage.setItem('favorites', JSON.stringify(filtered));
  } catch (e) {
    console.error('取消收藏失败:', e.message);
  }
}

/**
 * 检查影片是否已收藏
 * @param {string|number} movieId - 影片 ID
 * @returns {boolean} 是否已收藏
 */
export function isFavorite(movieId) {
  const favorites = getFavorites();
  return favorites.some(f => f.movieId === movieId);
}

// ==================== 弹幕 ====================

/**
 * 获取指定视频的弹幕列表
 * @param {string} videoId - 视频 ID（通常是影片ID+集数组合）
 * @returns {Array} 弹幕数组
 */
export function getDanmaku(videoId) {
  try {
    const stored = localStorage.getItem(`danmaku_${videoId}`);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('读取弹幕失败:', e.message);
    return [];
  }
}

/**
 * 添加弹幕
 * @param {string} videoId - 视频 ID
 * @param {Object} danmaku - 弹幕对象 { text, time, color, type 等字段 }
 */
export function addDanmaku(videoId, danmaku) {
  try {
    const list = getDanmaku(videoId);
    // 为弹幕生成唯一 ID
    const newDanmaku = {
      ...danmaku,
      id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      likes: 0,
      createdAt: Date.now()
    };
    list.push(newDanmaku);
    localStorage.setItem(`danmaku_${videoId}`, JSON.stringify(list));
    return newDanmaku;
  } catch (e) {
    console.error('添加弹幕失败:', e.message);
    return null;
  }
}

/**
 * 弹幕点赞
 * @param {string} videoId - 视频 ID
 * @param {string} danmakuId - 弹幕 ID
 */
export function likeDanmaku(videoId, danmakuId) {
  try {
    const list = getDanmaku(videoId);
    const target = list.find(d => d.id === danmakuId);
    if (target) {
      target.likes = (target.likes || 0) + 1;
      localStorage.setItem(`danmaku_${videoId}`, JSON.stringify(list));
    }
  } catch (e) {
    console.error('弹幕点赞失败:', e.message);
  }
}

// ==================== 播放设置 ====================

/**
 * 获取播放设置
 * @returns {Object} 播放设置对象
 */
export function getPlaySettings() {
  try {
    const stored = localStorage.getItem('playSettings');
    if (!stored) {
      // 返回默认设置
      return {
        playbackRate: 1,
        volume: 1,
        autoSkipAds: true,
        autoNextEpisode: true,
        defaultQuality: 'auto',
        subtitleEnabled: true,
        subtitleSize: 16,
        subtitleColor: '#FFFFFF'
      };
    }
    return { ...{
      playbackRate: 1,
      volume: 1,
      autoSkipAds: true,
      autoNextEpisode: true,
      defaultQuality: 'auto',
      subtitleEnabled: true,
      subtitleSize: 16,
      subtitleColor: '#FFFFFF'
    }, ...JSON.parse(stored) };
  } catch (e) {
    console.error('读取播放设置失败:', e.message);
    return {
      playbackRate: 1,
      volume: 1,
      autoSkipAds: true,
      autoNextEpisode: true,
      defaultQuality: 'auto',
      subtitleEnabled: true,
      subtitleSize: 16,
      subtitleColor: '#FFFFFF'
    };
  }
}

/**
 * 保存播放设置（合并式更新）
 * @param {Object} settings - 要更新的设置字段
 */
export function savePlaySettings(settings) {
  try {
    const current = getPlaySettings();
    const merged = { ...current, ...settings };
    localStorage.setItem('playSettings', JSON.stringify(merged));
  } catch (e) {
    console.error('保存播放设置失败:', e.message);
  }
}

// ==================== 运行模式 ====================

/**
 * 获取运行模式
 * 'local' 表示纯前端模式（直接请求 CMS API）
 * 'server' 表示后端代理模式（通过后端服务器请求）
 * @returns {string} 运行模式，默认 'local'
 */
export function getRunMode() {
  try {
    const stored = localStorage.getItem('runMode');
    if (!stored) return 'local';
    const mode = stored;
    // 校验值是否合法
    if (mode !== 'local' && mode !== 'server') return 'local';
    return mode;
  } catch (e) {
    console.error('读取运行模式失败:', e.message);
    return 'local';
  }
}

/**
 * 设置运行模式
 * @param {string} mode - 运行模式: 'local' 或 'server'
 */
export function setRunMode(mode) {
  try {
    if (mode !== 'local' && mode !== 'server') {
      console.warn('无效的运行模式:', mode, '仅支持 local 或 server');
      return;
    }
    localStorage.setItem('runMode', mode);
  } catch (e) {
    console.error('设置运行模式失败:', e.message);
  }
}
