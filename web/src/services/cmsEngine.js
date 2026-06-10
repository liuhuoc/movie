/**
 * CMS 聚合引擎（前端版）
 * 从后端 cmsAggregator.js 移植，使用浏览器原生 fetch API
 * 用于在前端直接请求 CMS 采集站 API，实现搜索、推荐、详情等功能
 */

// 默认CMS源列表（从后端 config.json 复制，共40个源）
const DEFAULT_CMS_SOURCES = [
  { name: '360影视', baseUrl: 'https://360zy.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '360影视2', baseUrl: 'https://www.360zy.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '爱奇艺', baseUrl: 'https://iqiyizy.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '非凡资源', baseUrl: 'https://cj.ffzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: 'U酷资源', baseUrl: 'https://api.ukuapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '麒麟资源', baseUrl: 'https://www.qilinzyz.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '番茄资源', baseUrl: 'http://api.fqzy.cc/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '红牛资源', baseUrl: 'https://www.hongniuzy1.com/inc/api.php', type: 'apple_cms', enabled: false },
  { name: '无尽资源', baseUrl: 'https://api.wujinapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '快播资源', baseUrl: 'http://www.kuaibozy.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '8090资源', baseUrl: 'http://zy.yilans.net:8090/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '量子资源', baseUrl: 'http://cj.lziapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '卧龙资源', baseUrl: 'https://collect.wolongzy.cc/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '八戒资源', baseUrl: 'https://www.bajiezy.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '最大资源', baseUrl: 'https://api.zuidapi.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '天空资源', baseUrl: 'https://api.tiankongapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '光速资源', baseUrl: 'https://api.guangsuapi.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '淘片资源', baseUrl: 'https://taopianapi.com/cjapi.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '百度云资源', baseUrl: 'https://api.apibdzy.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '新浪资源', baseUrl: 'https://api.xinlangapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '火狐资源', baseUrl: 'https://api.huhuzy.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '酷云资源', baseUrl: 'https://api.kyikan.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '麻花资源', baseUrl: 'http://www.mahuazy.net/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '8K资源', baseUrl: 'https://www.8k.cm/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '快车资源', baseUrl: 'https://caiji.kczyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: 'iKun资源', baseUrl: 'https://ikunzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '黑木耳资源', baseUrl: 'https://api.heihuzy.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '索尼资源', baseUrl: 'https://suonizy.net/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '飞速资源', baseUrl: 'https://www.feisuzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '如意资源', baseUrl: 'https://www.ryzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '魔戒资源', baseUrl: 'https://www.mjydy.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '欧乐资源', baseUrl: 'https://www.olevod.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '暴风资源', baseUrl: 'https://bfzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '鱼乐资源', baseUrl: 'https://api.ylzy1.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '影图资源', baseUrl: 'https://cj.vodimg.top/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '飘零资源', baseUrl: 'https://p2100.net/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '樱花资源', baseUrl: 'https://m3u8.apiyhzy.com/api.php/provide/vod', type: 'apple_cms', enabled: true },
  { name: '77资源', baseUrl: 'https://api.77zy.xyz/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '39资源', baseUrl: 'https://www.39kan.com/api.php/provide/vod', type: 'apple_cms', enabled: false },
  { name: '金鹰资源', baseUrl: 'https://jyzyapi.com/api.php/provide/vod', type: 'apple_cms', enabled: true }
];

// localStorage 存储键名
const STORAGE_KEY = 'cmsSources';

// 通用请求头
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * 类型映射 - 将 CMS 返回的分类文本映射为标准类型标识
 * @param {string} cmsType - CMS 返回的分类名称
 * @returns {string} 标准类型: movie / tv / variety / anime
 */
function mapType(cmsType) {
  if (!cmsType) return 'movie';
  const t = String(cmsType);
  // 综艺
  if (t.includes('综艺') || t.includes('秀')) return 'variety';
  // 动漫
  if (t.includes('动漫') || t.includes('动画') || t.includes('番')) return 'anime';
  // 电视剧相关（在片之前检查）
  if (t.includes('剧') || t.includes('TV') || t.includes('电视')) return 'tv';
  // 电影（默认）
  if (t.includes('电影') || t.includes('片')) return 'movie';
  return 'movie';
}

/**
 * 判断 typeText 是否匹配目标分类
 * @param {string} typeText - CMS 返回的分类文本
 * @param {string} targetType - 目标分类: movie / tv / variety / anime
 * @returns {boolean}
 */
function matchType(typeText, targetType) {
  if (!typeText) return targetType === 'movie';
  const t = String(typeText);
  switch (targetType) {
    case 'movie':
      return t.includes('电影') || t.includes('片');
    case 'tv':
      return t.includes('剧') || t.includes('TV') || t.includes('电视');
    case 'variety':
      return t.includes('综艺') || t.includes('秀');
    case 'anime':
      return t.includes('动漫') || t.includes('动画') || t.includes('番');
    default:
      return true;
  }
}

/**
 * 解析播放地址 - 将 CMS 返回的原始播放数据解析为结构化格式
 * 播放地址格式: "线路1$$$第1集$url#第2集$url$$$线路2$$$..."
 * @param {string} playFrom - 播放来源名称，多个用 $$$ 分隔
 * @param {string} playUrl - 播放地址，多个线路用 $$$ 分隔，集数用 # 分隔
 * @param {string} defaultSourceName - 默认来源名称
 * @returns {Array} 结构化播放源数组
 */
function parsePlayUrls(playFrom, playUrl, defaultSourceName = '') {
  if (!playFrom || !playUrl) return [];

  const sources = [];
  const fromList = playFrom.split('$$$');
  const urlList = playUrl.split('$$$');

  for (let i = 0; i < fromList.length; i++) {
    const siteName = fromList[i].trim() || defaultSourceName;
    const urlStr = urlList[i] || '';

    // 格式: "第1集$url#第2集$url" 或 "第1集$url\n第2集$url"
    const episodes = [];
    const epList = urlStr.split(/[#\n]/).filter(Boolean);

    for (const ep of epList) {
      const match = ep.match(/^(.+?)\$(.+)$/);
      if (match) {
        episodes.push({
          name: match[1].trim(),
          url: match[2].trim()
        });
      }
    }

    if (episodes.length > 0) {
      sources.push({
        siteName,
        episodeCount: episodes.length,
        episodes
      });
    }
  }

  return sources;
}

/**
 * 获取 CMS 源列表
 * 从 localStorage 读取已保存的配置，如果没有则使用默认值
 * @returns {Array} CMS 源配置数组
 */
export function getCmsSources() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('读取 CMS 源配置失败:', e.message);
  }
  return [...DEFAULT_CMS_SOURCES];
}

/**
 * 保存 CMS 源列表到 localStorage
 * @param {Array} sources - CMS 源配置数组
 */
export function saveCmsSources(sources) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (e) {
    console.error('保存 CMS 源配置失败:', e.message);
  }
}

/**
 * 搜索单个 CMS 源
 * 使用浏览器原生 fetch API 请求 CMS 搜索接口
 * @param {Object} source - CMS 源配置 { baseUrl, name }
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 搜索结果数组
 */
export async function searchAppleCMS(source, keyword) {
  try {
    const url = `${source.baseUrl}/?ac=detail&wd=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000), // 超时 6 秒
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': source.baseUrl
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !data.list) return [];

    return data.list.map(item => ({
      id: item.vod_id,
      title: item.vod_name,
      cover: item.vod_pic,
      year: item.vod_year,
      area: item.vod_area,
      type: mapType(item.type_name || item.vod_class),
      typeText: item.type_name || item.vod_class,
      rating: parseFloat(item.vod_douban_score) || 0,
      director: (item.vod_director || '').split(/[,\/]/).filter(Boolean),
      actor: (item.vod_actor || '').split(/[,\/]/).filter(Boolean),
      description: item.vod_content || item.vod_blurb,
      status: item.vod_remarks || '',
      totalEpisodes: parseInt(item.vod_total) || 0,
      currentEpisode: parseInt(item.vod_serial) || 0,
      episodeText: item.vod_remarks,
      updateTime: item.vod_time,
      sourceName: source.name,
      sourceUrl: source.baseUrl,
      // 播放地址原始数据
      playUrlRaw: item.vod_play_url || '',
      playFrom: item.vod_play_from || '',
      // 提取结构化播放源
      sources: parsePlayUrls(item.vod_play_from, item.vod_play_url, source.name)
    }));
  } catch (err) {
    console.error(`[${source.name}] 搜索失败:`, err.message);
    return [];
  }
}

/**
 * 从单个 CMS 源获取最新影片列表
 * @param {Object} source - CMS 源配置 { baseUrl, name }
 * @param {number} limit - 获取数量，默认 30
 * @returns {Promise<Array>} 最新影片数组
 */
export async function getLatestFromCMS(source, limit = 30) {
  try {
    const url = `${source.baseUrl}/?ac=videolist&pg=1&pagesize=${limit}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 超时 10 秒
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': source.baseUrl
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !data.list) return [];

    return data.list.map(item => ({
      id: item.vod_id,
      title: item.vod_name,
      cover: item.vod_pic,
      year: item.vod_year,
      area: item.vod_area,
      type: mapType(item.vod_class || item.type_name),
      typeText: item.type_name || item.vod_class,
      rating: parseFloat(item.vod_douban_score) || 0,
      status: item.vod_remarks || '',
      episodeText: item.vod_remarks,
      updateTime: item.vod_time,
      sourceName: source.name,
      sourceUrl: source.baseUrl,
      sources: parsePlayUrls(item.vod_play_from, item.vod_play_url, source.name)
    }));
  } catch (err) {
    console.error(`[${source.name}] 获取最新影片失败:`, err.message);
    return [];
  }
}

/**
 * 聚合搜索 - 并行搜索所有启用的 CMS 源
 * 按 title + year 去重合并，同一影片在不同源的播放源会合并到一起
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 去重后的搜索结果数组
 */
export async function aggregateSearch(keyword) {
  const sources = getCmsSources().filter(s => s.enabled);

  // 并行搜索所有启用的源
  const promises = sources.map(source => searchAppleCMS(source, keyword));
  const allResults = await Promise.all(promises);

  // 按 title + year 去重合并
  const movieMap = new Map();

  for (const sourceResults of allResults) {
    for (const item of sourceResults) {
      const key = `${item.title}_${item.year}`;

      if (movieMap.has(key)) {
        // 合并播放源
        const existing = movieMap.get(key);
        existing.sources.push(...item.sources);
      } else {
        movieMap.set(key, item);
      }
    }
  }

  return Array.from(movieMap.values());
}

/**
 * 获取热门推荐 - 从所有启用的源获取最新影片，去重排序
 * @param {string} type - 可选分类过滤: movie / tv / variety / anime
 * @param {number} limit - 返回数量，默认 12
 * @returns {Promise<Array>} 推荐影片数组
 */
export async function getHotRecommendations(type = '', limit = 12) {
  const sources = getCmsSources().filter(s => s.enabled);

  // 每个源独立请求，带单独超时，不互相阻塞
  const promises = sources.map(source =>
    Promise.race([
      getLatestFromCMS(source, 30),
      new Promise(resolve => setTimeout(() => resolve([]), 10000)) // 单个源最多等 10 秒
    ])
  );

  const allResults = await Promise.all(promises);

  // 按影片名去重，优先保留有封面和更新时间最新的
  const movieMap = new Map();

  for (const sourceResults of allResults) {
    for (const item of sourceResults) {
      const key = `${item.title}_${item.year}`;
      const existing = movieMap.get(key);
      if (!existing) {
        movieMap.set(key, item);
      } else {
        const existTime = existing.updateTime ? new Date(existing.updateTime).getTime() : 0;
        const newTime = item.updateTime ? new Date(item.updateTime).getTime() : 0;
        if ((!existing.cover && item.cover) || newTime > existTime) {
          movieMap.set(key, item);
        }
      }
    }
  }

  let results = Array.from(movieMap.values());

  // 根据分类过滤
  if (type) {
    results = results.filter(item => matchType(item.typeText, type));
  }

  // 按更新时间降序排列，最新的在前
  results.sort((a, b) => {
    const timeA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
    const timeB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
    return timeB - timeA;
  });

  return results.slice(0, limit);
}

/**
 * 获取单个影片详情
 * @param {string} sourceUrl - CMS 源的 baseUrl
 * @param {string|number} vodId - 影片 ID
 * @returns {Promise<Object|null>} 影片详情对象，失败返回 null
 */
export async function getMovieDetail(sourceUrl, vodId) {
  try {
    const url = `${sourceUrl}/?ac=detail&ids=${vodId}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 超时 10 秒
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': sourceUrl
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.list || data.list.length === 0) {
      return null;
    }

    const item = data.list[0];
    return {
      id: item.vod_id,
      title: item.vod_name,
      cover: item.vod_pic,
      year: item.vod_year,
      area: item.vod_area,
      type: mapType(item.vod_class || item.type_name),
      typeText: item.type_name || item.vod_class,
      rating: parseFloat(item.vod_douban_score) || 0,
      director: (item.vod_director || '').split(/[,\/]/).filter(Boolean),
      actor: (item.vod_actor || '').split(/[,\/]/).filter(Boolean),
      description: item.vod_content || item.vod_blurb,
      status: item.vod_remarks,
      sources: parsePlayUrls(item.vod_play_from, item.vod_play_url)
    };
  } catch (err) {
    console.error('获取详情失败:', err.message);
    return null;
  }
}

export { DEFAULT_CMS_SOURCES };
