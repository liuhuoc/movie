/**
 * 本地存储服务
 * 替代 MongoDB，使用 localStorage 实现数据的持久化存储
 * 包含观看历史、收藏、弹幕、播放设置、运行模式等功能
 * 视频缓存在 Capacitor 环境下使用文件系统 API，支持大容量存储
 */

// ==================== 平台检测 ====================
// 检测是否为 Capacitor 原生环境
export const isCapacitor = () => {
  return typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.Plugins !== undefined
}

// Capacitor 文件系统存储模块（动态加载）
let fsStore = null

async function getFsStore() {
  if (fsStore) return fsStore
  try {
    const module = await import('./fsStore.js')
    fsStore = module
    return fsStore
  } catch (e) {
    console.error('加载文件系统存储模块失败', e)
    return null
  }
}

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

// ==================== 视频缓存（本地模式 - 使用 IndexedDB） ====================
//
// 浏览器环境使用 IndexedDB 存储二进制视频文件；
// Capacitor（安卓）环境下可切换为 File System API，保存到设备的"缓存视频目录"。
// 通过 localStorage 中的 cacheDir 标识存储路径 / 缓存大小限制。

const DB_NAME = 'videoCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// 获取/设置缓存目录配置（用于 Capacitor 环境；浏览器环境只是逻辑上的标识）
export function getCacheDir() {
  try {
    return localStorage.getItem('cacheDir') || 'video_cache';
  } catch (e) {
    return 'video_cache';
  }
}

export function setCacheDir(dir) {
  try {
    localStorage.setItem('cacheDir', dir || 'video_cache');
  } catch (e) {
    console.error('设置缓存目录失败:', e.message);
  }
}

// 获取/设置缓存大小限制（MB）
export function getCacheSizeLimit() {
  try {
    const v = parseInt(localStorage.getItem('cacheSizeLimit'), 10);
    return (v > 0 && v <= 200000) ? v : 512;
  } catch (e) {
    return 512;
  }
}

export function setCacheSizeLimit(mb) {
  try {
    const v = parseInt(mb, 10);
    localStorage.setItem('cacheSizeLimit', String(v));
  } catch (e) {
    console.error('设置缓存大小失败:', e.message);
  }
}

// ---- IndexedDB helper ----
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

function withDB(action) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      try {
        const result = action(db, resolve, reject);
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    }).finally(() => db.close());
  });
}

/**
 * 获取缓存视频列表
 * Capacitor 环境下使用文件系统，浏览器环境使用 IndexedDB
 */
export async function getVideoCacheList() {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.getVideoCacheList()
  }
  // 浏览器环境使用 IndexedDB
  return withDB((db, resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || []).map(item => ({
        _id: item.id,
        id: item.id,
        title: item.title,
        episodeName: item.episodeName,
        poster: item.poster,
        fileSize: item.fileSize || 0,
        mimeType: item.mimeType || 'video/mp4',
        status: 'ready',
        sourceUrl: item.sourceUrl || '',
        createdAt: item.createdAt,
        // blob 通过 getVideoCacheBlob 单独获取
      }));
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(items);
    };
    req.onerror = () => resolve([]);
  }).catch(() => []);
}

/**
 * 读取单个缓存视频的 Blob（浏览器）或文件 URI（Capacitor）
 * 返回值：浏览器返回 Blob，Capacitor 返回文件 URI 字符串
 */
export async function getVideoCacheBlob(id) {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.getVideoCacheUrl(id)
    return null
  }
  // 浏览器环境使用 IndexedDB
  return withDB((db, resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result && req.result.blob) {
        resolve(req.result.blob);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  }).catch(() => null);
}

/**
 * 估算当前缓存总量（字节）
 */
export async function getVideoCacheTotalSize() {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.getVideoCacheTotalSize()
  }
  return withDB((db, resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    let total = 0;
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        total += cursor.value.fileSize || 0;
        cursor.continue();
      } else {
        resolve(total);
      }
    };
    req.onerror = () => resolve(total);
  }).catch(() => 0);
}

/**
 * 删除最旧的缓存，直到腾出 spaceNeeded 字节
 */
function makeRoom(db, spaceNeeded) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const req = index.openCursor(null, 'next'); // 最旧的先
    let freed = 0;

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && freed < spaceNeeded) {
        freed += cursor.value.fileSize || 0;
        cursor.delete();
        cursor.continue();
      } else {
        resolve(freed);
      }
    };
    req.onerror = () => resolve(freed);
  });
}

/**
 * 保存一个视频到缓存
 * Capacitor 环境下使用文件系统（支持大容量），浏览器环境使用 IndexedDB
 * @param {Object} meta - { id, title, episodeName, poster, sourceUrl, mimeType }
 * @param {Blob} blob - 视频二进制数据
 */
export async function saveVideoCache(meta, blob) {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.saveVideoCache(meta, blob)
    return { success: false, error: '文件系统模块不可用' }
  }

  try {
    const fileSize = blob.size;
    const limitBytes = getCacheSizeLimit() * 1024 * 1024;

    // 单个文件超限时直接拒绝
    if (fileSize > limitBytes) {
      return { success: false, error: '文件大小超过缓存上限' };
    }

    const db = await openDB();
    try {
      // 先估算占用
      const tx0 = db.transaction(STORE_NAME, 'readonly');
      const store0 = tx0.objectStore(STORE_NAME);
      const req0 = store0.openCursor();
      let total = 0;
      const existingPromise = new Promise((resolve) => {
        req0.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            total += cursor.value.fileSize || 0;
            cursor.continue();
          } else {
            resolve();
          }
        };
        req0.onerror = () => resolve();
      });
      await existingPromise;

      // 需要腾出空间
      if (total + fileSize > limitBytes) {
        await makeRoom(db, total + fileSize - limitBytes);
      }

      // 写入（若 id 相同则覆盖）
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: meta.id,
        title: meta.title || '未命名视频',
        episodeName: meta.episodeName || '',
        poster: meta.poster || '',
        sourceUrl: meta.sourceUrl || '',
        mimeType: meta.mimeType || 'video/mp4',
        fileSize: fileSize,
        blob: blob,
        createdAt: meta.createdAt || Date.now(),
      };
      const req = store.put(record);
      return await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve({ success: true });
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  } catch (e) {
    console.error('保存视频缓存失败:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 删除一个缓存视频
 * Capacitor 环境下使用文件系统，浏览器环境使用 IndexedDB
 */
export async function deleteVideoCache(id) {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.deleteVideoCache(id)
    return { success: false, error: '文件系统模块不可用' }
  }
  return withDB((db, resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve({ success: true });
    req.onerror = () => resolve({ success: false });
  }).catch(() => ({ success: false }));
}

/**
 * 清空全部视频缓存
 * Capacitor 环境下使用文件系统，浏览器环境使用 IndexedDB
 */
export async function clearVideoCache() {
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.clearVideoCache()
    return { success: false, error: '文件系统模块不可用' }
  }
  return withDB((db, resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve({ success: true });
    req.onerror = () => resolve({ success: false });
  }).catch(() => ({ success: false }));
}

/**
 * 从远程 URL 下载视频并缓存
 * Capacitor 环境下使用文件系统，浏览器环境使用 IndexedDB
 * @param {Object} meta - { id, title, episodeName, poster, sourceUrl }
 * @param {Function} onProgress - (percent) => void
 */
export async function downloadAndCacheVideo(meta, onProgress) {
  // Capacitor 环境使用文件系统存储
  if (isCapacitor()) {
    const fs = await getFsStore()
    if (fs) return fs.downloadAndCacheVideo(meta, onProgress)
    return { success: false, error: '文件系统模块不可用' }
  }

  try {
    const controller = new AbortController();
    const resp = await fetch(meta.sourceUrl, {
      signal: controller.signal,
      headers: meta.headers || {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
    const reader = resp.body ? resp.body.getReader() : null;
    const mimeType = resp.headers.get('content-type') || 'video/mp4';

    let received = 0;
    const chunks = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength && onProgress) {
          onProgress(Math.min(99, (received / contentLength) * 100));
        }
      }
    } else {
      const buf = await resp.arrayBuffer();
      chunks.push(new Uint8Array(buf));
      received = buf.byteLength;
    }

    const blob = new Blob(chunks, { type: mimeType });
    const result = await saveVideoCache({ ...meta, mimeType }, blob);
    if (onProgress) onProgress(100);
    return result;
  } catch (e) {
    console.error('下载并缓存视频失败:', e.message);
    return { success: false, error: e.message };
  }
}

// ============== 目录浏览器导出 ==============
// 转发到 fsStore.js（仅在 Capacitor 环境可用）

export async function getStorageDirectories() {
  if (!isCapacitor()) return []
  const fs = await getFsStore()
  if (fs) return fs.getStorageDirectories()
  return []
}

export async function browseDirectory(baseDirKey, subPath) {
  if (!isCapacitor()) return { dirs: [], path: subPath || '', baseDirKey }
  const fs = await getFsStore()
  if (fs) return fs.browseDirectory(baseDirKey, subPath)
  return { dirs: [], path: subPath || '', baseDirKey }
}

export async function createCacheDirectory(baseDirKey, subPath) {
  if (!isCapacitor()) return null
  const fs = await getFsStore()
  if (fs) return fs.createCacheDirectory(baseDirKey, subPath)
  return null
}

export function getCacheStorageInfo() {
  // 浏览器环境使用 localStorage 的值
  if (!isCapacitor()) {
    return {
      baseDirKey: 'Application',
      subDir: getCacheDir(),
      fullPath: getCacheDir()
    }
  }
  // Capacitor 环境延迟获取
  return {
    baseDirKey: localStorage.getItem('cacheStorageType') || 'Application',
    subDir: getCacheDir(),
    fullPath: getCacheDir()
  }
}

export function setCacheStorageInfo(baseDirKey, subDir) {
  localStorage.setItem('cacheStorageType', baseDirKey)
  setCacheDir(subDir || 'video_cache')
}
