import React, { useState, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import Hls from 'hls.js'
import { aggregateSearch as localSearch, getHotRecommendations as localHot, getCmsSources, saveCmsSources, DEFAULT_CMS_SOURCES, getMovieDetail } from './services/cmsEngine'
import { getHistory, saveHistory, deleteHistory, clearHistory, getFavorites, addFavorite, removeFavorite, isFavorite, getDanmaku, addDanmaku, getPlaySettings, savePlaySettings, getRunMode, setRunMode, getVideoCacheList, getVideoCacheBlob, getVideoCacheTotalSize, deleteVideoCache, clearVideoCache, downloadAndCacheVideo, getCacheDir, setCacheDir, getCacheSizeLimit, setCacheSizeLimit, isCapacitor, getStorageDirectories, browseDirectory, createCacheDirectory, getCacheStorageInfo, setCacheStorageInfo } from './services/localStore'

// ===== API =====
// 运行模式: 'local' = 前端直连CMS源（无需后端），'server' = 通过后端API
const RUN_MODE = getRunMode()
const API = RUN_MODE === 'server' ? (localStorage.getItem('apiBaseUrl') || '') : ''

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

// 统一 API 层：根据运行模式自动选择本地或远程
const api = {
  // 搜索
  async search(keyword) {
    if (RUN_MODE === 'local') {
      const results = await localSearch(keyword)
      return { success: true, data: results, sources: getCmsSources().filter(s => s.enabled).map(s => s.name) }
    }
    const res = await fetch(`${API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: keyword }) })
    return res.json()
  },
  // 热门推荐
  async hot(type = '', limit = 18) {
    if (RUN_MODE === 'local') {
      const result = await localHot(type, limit)
      return { success: true, data: result.data, sources: getCmsSources().filter(s => s.enabled).map(s => s.name), fromMock: result.fromMock }
    }
    const params = new URLSearchParams({ limit, type })
    return fetchJSON(`${API}/search/hot?${params}`)
  },
  // 历史
  async getHistory() {
    if (RUN_MODE === 'local') return { success: true, data: getHistory() }
    return fetchJSON(`${API}/history`)
  },
  async saveHistory(item) {
    if (RUN_MODE === 'local') { saveHistory(item); return { success: true } }
    return fetch(`${API}/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(r => r.json())
  },
  async deleteHistory(id) {
    if (RUN_MODE === 'local') { deleteHistory(id); return { success: true } }
    return fetch(`${API}/history/${id}`, { method: 'DELETE' }).then(r => r.json())
  },
  async clearHistory() {
    if (RUN_MODE === 'local') { clearHistory(); return { success: true } }
    return fetch(`${API}/history`, { method: 'DELETE' }).then(r => r.json())
  },
  // 收藏
  async getFavorites() {
    if (RUN_MODE === 'local') return { success: true, data: getFavorites() }
    return fetchJSON(`${API}/favorite`)
  },
  async addFavorite(item) {
    if (RUN_MODE === 'local') { addFavorite(item); return { success: true } }
    return fetch(`${API}/favorite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(r => r.json())
  },
  async removeFavorite(id) {
    if (RUN_MODE === 'local') { removeFavorite(id); return { success: true } }
    return fetch(`${API}/favorite/${id}`, { method: 'DELETE' }).then(r => r.json())
  },
  async isFavorite(movieId) {
    if (RUN_MODE === 'local') return isFavorite(movieId)
    try { const data = await fetchJSON(`${API}/favorite`); return data.data?.some(f => f.movieId === movieId) } catch { return false }
  },
  // 弹幕
  async getDanmaku(videoId) {
    if (RUN_MODE === 'local') return { success: true, data: getDanmaku(videoId) }
    return fetchJSON(`${API}/danmaku/${videoId}`)
  },
  async addDanmaku(danmaku) {
    if (RUN_MODE === 'local') { addDanmaku(danmaku.videoId, danmaku); return { success: true } }
    return fetch(`${API}/danmaku`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(danmaku) }).then(r => r.json())
  },
  // 设置/源
  async getSettings() {
    if (RUN_MODE === 'local') {
      return { success: true, data: { sources: getCmsSources(), settings: getPlaySettings() } }
    }
    return fetchJSON(`${API}/settings`)
  },
  async toggleSource(name) {
    if (RUN_MODE === 'local') {
      const sources = getCmsSources()
      const s = sources.find(s => s.name === name)
      if (s) { s.enabled = !s.enabled; saveCmsSources(sources) }
      return { success: true }
    }
    return fetch(`${API}/settings/sources/${encodeURIComponent(name)}/toggle`, { method: 'POST' }).then(r => r.json())
  },
  async deleteSource(name) {
    if (RUN_MODE === 'local') {
      const sources = getCmsSources().filter(s => s.name !== name)
      saveCmsSources(sources)
      return { success: true }
    }
    return fetch(`${API}/settings/sources/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(r => r.json())
  },
  async addSource(source) {
    if (RUN_MODE === 'local') {
      const sources = getCmsSources()
      sources.push({ ...source, enabled: true })
      saveCmsSources(sources)
      return { success: true }
    }
    return fetch(`${API}/settings/sources/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(source) }).then(r => r.json())
  },
  async savePlaySettings(settings) {
    if (RUN_MODE === 'local') { savePlaySettings(settings); return { success: true } }
    return fetch(`${API}/settings/app`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }).then(r => r.json())
  },
  // 缓存（本地模式用 IndexedDB，服务器模式走后端 API）
  async getCacheList() {
    if (RUN_MODE === 'local') {
      const data = await getVideoCacheList()
      return { success: true, data }
    }
    return fetchJSON(`${API}/cache/list`)
  },
  async cacheDownload(item, onProgress) {
    if (RUN_MODE === 'local') {
      if (!item || !item.sourceUrl) return { success: false, error: '缺少视频地址' }
      return await downloadAndCacheVideo(item, onProgress)
    }
    return fetch(`${API}/cache/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(r => r.json())
  },
  async deleteCache(id) {
    if (RUN_MODE === 'local') {
      return await deleteVideoCache(id)
    }
    return fetch(`${API}/cache/${id}`, { method: 'DELETE' }).then(r => r.json())
  },
  async getCacheSettings() {
    return {
      success: true,
      data: {
        dir: getCacheDir(),
        sizeLimit: getCacheSizeLimit(),
        total: await (RUN_MODE === 'local' ? getVideoCacheTotalSize() : Promise.resolve(0))
      }
    }
  },
  async saveCacheSettings({ dir, sizeLimit }) {
    if (dir != null) setCacheDir(dir)
    if (sizeLimit != null) setCacheSizeLimit(sizeLimit)
    return { success: true }
  },
}

// ===== Icons =====
const Icons = {
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  film: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  skip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  heartFilled: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.68 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
}

// ===== Helpers =====
function makeMovieId(title, episodeName) {
  return `${title}::${episodeName || ''}`
}

function PosterImg({ src, alt, style }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <div className="placeholder" style={{ fontSize: '24px', ...style }}>{Icons.film}</div>
  return <img src={src} alt={alt} onError={() => setErr(true)} onContextMenu={e => e.preventDefault()} style={style} />
}

// ===== Header =====
function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/', label: '首页', icon: Icons.film },
    { path: '/search', label: '搜索', icon: Icons.search },
    { path: '/history', label: '历史', icon: Icons.clock },
    { path: '/favorite', label: '收藏', icon: Icons.star },
    { path: '/cache', label: '缓存', icon: Icons.download },
    { path: '/settings', label: '设置', icon: Icons.settings },
  ]

  return (
    <>
      <header className="header">
        <Link to="/" className="header-logo">
          {Icons.film}
          <span>影视聚合</span>
        </Link>
        <nav className="header-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={isActive(item.path) ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="mobile-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="菜单">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      {/* Mobile side menu */}
      <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`mobile-menu-panel ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span>菜单</span>
          <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="mobile-menu-links">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={isActive(item.path) ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {navItems.slice(0, 5).map(item => (
            <Link key={item.path} to={item.path} className={isActive(item.path) ? 'active' : ''}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

// ===== Movie Card =====
function MovieCard({ movie, onClick, sourceTag }) {
  const [imgError, setImgError] = useState(false)
  const hasCover = movie.cover && !imgError

  return (
    <div className="movie-card" onClick={() => onClick?.(movie)}>
      <div className="movie-card-poster">
        {hasCover ? (
          <img src={movie.cover} alt={movie.title} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="placeholder">{Icons.film}</div>
        )}
        <div className="movie-card-overlay">
          <div className="movie-card-play">{Icons.play}</div>
        </div>
        {movie.rating > 0 && <div className="movie-card-badge">{movie.rating.toFixed(1)}</div>}
        {movie.episodeText && <div className="movie-card-update">{movie.episodeText}</div>}
        {sourceTag && <div className="movie-card-source">{sourceTag}</div>}
      </div>
      <div className="movie-card-info">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-meta">
          {[movie.year, movie.typeText].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

// ===== Home Page =====
function HomePage() {
  const navigate = useNavigate()
  const [hotMovies, setHotMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMovie, setLoadingMovie] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [showProxyTip, setShowProxyTip] = useState(false)

  // 本地缓存key和过期时间(2分钟)
  const CACHE_KEY = 'hotMovies_cache'
  const CACHE_EXPIRE = 2 * 60 * 1000

  const loadHotMovies = (forceRefresh = false) => {
    const params = new URLSearchParams()
    params.set('limit', '18')
    if (selectedType) {
      const typeMap = { '电影': 'movie', '电视剧': 'tv', '综艺': 'variety', '动漫': 'anime' }
      params.set('type', typeMap[selectedType] || '')
    }
    const cacheKey = `${CACHE_KEY}_${selectedType || 'all'}`

    // 先读本地缓存（缓存中也保存fromMock状态）
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp, fromMock } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_EXPIRE) {
            setHotMovies(data)
            setLoading(false)
            // 只有缓存不是mock数据时才显示正常
            setShowProxyTip(Boolean(fromMock))
            // 后台静默刷新
            fetchHotFromServer(params, cacheKey, false)
            return
          }
        }
      } catch (e) {
        // 缓存解析失败，继续请求
      }
    }

    // 无缓存或已过期，显示loading并请求
    setLoading(true)
    fetchHotFromServer(params, cacheKey, true)
  }

  const fetchHotFromServer = (params, cacheKey, updateLoading) => {
    const typeMap = { '电影': 'movie', '电视剧': 'tv', '综艺': 'variety', '动漫': 'anime' }
    api.hot(selectedType ? typeMap[selectedType] || '' : '', 18)
      .then((data) => {
        if (data.success) {
          const movies = data.data || []
          setHotMovies(movies)
          // 写入本地缓存（保存fromMock状态）
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: movies,
              timestamp: Date.now(),
              fromMock: data.fromMock
            }))
          } catch (e) {
            // localStorage满或其他错误
          }
          // 如果使用Mock数据，显示提示；否则清除提示
          if (data.fromMock) {
            setShowProxyTip(true)
          } else {
            setShowProxyTip(false)
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (updateLoading) setLoading(false)
      })
  }

  useEffect(() => {
    loadHotMovies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType])

  const playMovie = async (movie) => {
    // 如果有播放源且有效，直接播放
    const firstSource = movie.sources?.[0]
    const firstEp = firstSource?.episodes?.[0]
    if (firstEp && firstEp.url) {
      navigate('/play/aggregate', {
        state: {
          title: movie.title,
          cover: movie.cover,
          url: firstEp.url,
          episode: firstEp.name,
          sources: movie.sources,
          activeSource: 0,
          activeEpisode: 0,
        },
      })
      return
    }

    // 没有播放地址，从 CMS 获取详情
    if (movie.id && movie.sourceUrl) {
      setLoadingMovie(true)
      try {
        const detail = await getMovieDetail(movie.sourceUrl, movie.id)
        if (detail && detail.sources && detail.sources.length > 0) {
          const ep = detail.sources[0].episodes?.[0]
          if (ep && ep.url) {
            navigate('/play/aggregate', {
              state: {
                title: movie.title,
                cover: movie.cover,
                url: ep.url,
                episode: ep.name,
                sources: detail.sources,
                activeSource: 0,
                activeEpisode: 0,
              },
            })
            setLoadingMovie(false)
            return
          }
        }
      } catch (e) {
        console.error('获取影片详情失败', e)
      }
      setLoadingMovie(false)
    }

    alert('暂无播放地址，请尝试其他影片')
  }

  const typeOptions = ['电影', '电视剧', '综艺', '动漫']

  return (
    <div className="main">
      <div className="hero">
        <h1><span>影视聚合</span>播放器</h1>
        <p>搜索全网影片，聚合多源播放</p>
        <button className="btn-play" onClick={() => navigate('/search')}>
          立即搜索
        </button>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">热门推荐</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {typeOptions.map((t) => (
              <button
                key={t}
                className={`btn-secondary ${selectedType === t ? 'active' : ''}`}
                onClick={() => setSelectedType(selectedType === t ? '' : t)}
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* CORS代理提示 */}
        {showProxyTip && !loading && (
          <div style={{
            padding: '14px 16px', marginBottom: '12px', background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--brand)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>提示：正在使用演示数据（CMS源无法连接）</span>
              <button
                onClick={() => {
                  // 清除所有缓存并强制刷新
                  try {
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith('hotMovies_cache')) {
                        localStorage.removeItem(key);
                      }
                    }
                  } catch (e) {}
                  setShowProxyTip(false);
                  loadHotMovies(true);
                }}
                style={{
                  padding: '4px 12px', fontSize: '12px', cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)'
                }}
              >
                重新加载
              </button>
            </div>
            <div style={{ lineHeight: 1.8 }}>
              如果这是你第一次看到此提示，可能是部分影视源连接较慢。
              点击上方"重新加载"按钮重试，或在设置页面配置CORS代理地址：
              <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}>
                https://corsproxy.io/?
              </code>
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : hotMovies.length === 0 ? (
          <div className="empty">
            <p>暂无热门影片</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>请检查CMS源配置</p>
          </div>
        ) : (
          <div className="movie-grid">
            {hotMovies.map((m) => (
              <MovieCard key={`${m.title}_${m.year}`} movie={m} onClick={playMovie} sourceTag={m.sourceName} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Search Page (聚合搜索) =====
function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sources, setSources] = useState([])
  const lastSearchedRef = useRef('')

  useEffect(() => {
    if (query && query.trim()) {
      // 如果同一个关键词已经搜过且有结果，跳过重复搜索
      if (lastSearchedRef.current === query.trim()) return

      // 先尝试从 sessionStorage 读取缓存
      const cacheKey = `searchCache_${query.trim()}`
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { data, srcs, ts } = JSON.parse(cached)
          if (Date.now() - ts < 5 * 60 * 1000) {
            setResults(data)
            setSources(srcs || [])
            setSearched(true)
            setLoading(false)
            lastSearchedRef.current = query.trim()
            return
          }
        }
      } catch (e) {}

      setLoading(true)
      setSearched(true)
      lastSearchedRef.current = query.trim()
      api.search(query.trim())
        .then((data) => {
          if (data.success) {
            setResults(data.data)
            setSources(data.sources || [])
            // 写入 sessionStorage 缓存
            try {
              sessionStorage.setItem(`searchCache_${query.trim()}`, JSON.stringify({
                data: data.data,
                srcs: data.sources || [],
                ts: Date.now()
              }))
            } catch (e) {}
          }
        })
        .catch((err) => {
          console.error('搜索失败:', err)
          setResults([])
        })
        .finally(() => setLoading(false))
    } else if (query === '') {
      setSearched(false)
      setResults([])
      lastSearchedRef.current = ''
    }
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  const playMovie = async (movie) => {
    // 直接跳转到播放器，带上所有播放源信息
    if (movie.sources && movie.sources.length > 0) {
      const firstSource = movie.sources[0]
      const firstEp = firstSource.episodes[0]
      if (firstEp && firstEp.url) {
        navigate('/play/aggregate', {
          state: {
            title: movie.title,
            cover: movie.cover,
            url: firstEp.url,
            episode: firstEp.name || '',
            sources: movie.sources,
            activeSource: 0,
            activeEpisode: 0,
          },
        })
        return
      }
    }

    // 没有播放地址，从 CMS 获取详情
    if (movie.id && movie.sourceUrl) {
      try {
        const detail = await getMovieDetail(movie.sourceUrl, movie.id)
        if (detail && detail.sources && detail.sources.length > 0) {
          const ep = detail.sources[0].episodes?.[0]
          if (ep && ep.url) {
            navigate('/play/aggregate', {
              state: {
                title: movie.title,
                cover: movie.cover,
                url: ep.url,
                episode: ep.name,
                sources: detail.sources,
                activeSource: 0,
                activeEpisode: 0,
              },
            })
            return
          }
        }
      } catch (e) {
        console.error('获取影片详情失败', e)
      }
    }

    alert('暂无可用播放地址')
  }

  const hotTags = ['三体', '狂飙', '流浪地球', '奥本海默', '繁花', '漫长的季节', '铃芽之旅', '灌篮高手']

  return (
    <div className="main">
      <div className="search-page">
        <form onSubmit={handleSearch}>
          <div style={{ position: 'relative', display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                {Icons.search}
              </span>
              <input
                className="search-input-lg"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入影片名搜索全网资源..."
                autoFocus
              />
            </div>
            <button type="submit" className="btn-play" style={{ padding: '14px 28px', borderRadius: 'var(--radius-xl)', whiteSpace: 'nowrap' }}>
              搜索
            </button>
          </div>
        </form>

        {!searched && (
          <div className="search-hot">
            <div className="search-hot-title">热门搜索</div>
            <div className="search-hot-tags">
              {hotTags.map((tag) => (
                <button key={tag} className="search-hot-tag" onClick={() => { setInput(tag); setSearchParams({ q: tag }) }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {searched && sources.length > 0 && (
          <div className="search-sources">
            <span>已搜索源: {sources.join('、')}</span>
          </div>
        )}

        {loading && <div className="loading"><div className="spinner" /></div>}

        {!loading && searched && results.length === 0 && (
          <div className="empty">
            <p>未找到 "{query}" 相关影片</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>建议更换关键词试试</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="movie-grid" style={{ marginTop: 24 }}>
            {results.map((m, idx) => (
              <MovieCard
                key={`${m.id || idx}-${m.sourceName || ''}`}
                movie={m}
                onClick={playMovie}
                sourceTag={m.sources?.length > 1 ? `${m.sources.length}个源` : m.sourceName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Player Page (聚合播放) =====
function PlayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}

  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const adSkipTimerRef = useRef(null)
  const historyTimerRef = useRef(null)
  const precacheTimerRef = useRef(null)

  const [activeSource, setActiveSource] = useState(state.activeSource || 0)
  const [activeEpisode, setActiveEpisode] = useState(state.activeEpisode || 0)
  const [danmakuVisible, setDanmakuVisible] = useState(false)
  const [danmakuText, setDanmakuText] = useState('')
  const [adSegments, setAdSegments] = useState([])
  const [adSkipped, setAdSkipped] = useState(false)
  const [caching, setCaching] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFavorited, setIsFavorited] = useState(false)
  const [precacheProgress, setPrecacheProgress] = useState(null)
  const [playError, setPlayError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cachedEpNames, setCachedEpNames] = useState(new Set())

  const {
    title = '播放',
    cover = '',
    url = '',
    episode = '',
    sources = [],
  } = state

  const currentSource = sources[activeSource] || { episodes: [] }
  const currentEp = currentSource.episodes?.[activeEpisode]
  const currentUrl = currentEp?.url || url
  const episodeName = currentEp?.name || episode || '第1集'
  const movieId = makeMovieId(title, episodeName)

  // 加载已缓存剧集列表
  const loadCachedEpisodes = () => {
    api.getCacheList()
      .then(data => {
        if (data.success && data.data) {
          const names = new Set()
          data.data.forEach(item => {
            if (item.title === title && item.episodeName) {
              names.add(item.episodeName)
            }
          })
          setCachedEpNames(names)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { loadCachedEpisodes() }, [title])

  // 检查收藏状态
  useEffect(() => {
    api.isFavorite(movieId)
      .then((found) => {
        setIsFavorited(!!found)
      })
      .catch(() => {})
  }, [movieId])

  // 获取历史进度并恢复
  useEffect(() => {
    if (!movieId) return
    api.getHistory()
      .then((data) => {
        if (data.success && data.data) {
          const record = data.data.find((h) => h.movieId === movieId || makeMovieId(h.title, h.episodeName) === movieId)
          if (record && record.progress > 0 && videoRef.current) {
            videoRef.current.currentTime = record.progress
          }
        }
      })
      .catch(() => {})
  }, [movieId])

  // 广告自动跳过
  useEffect(() => {
    if (!adSegments.length || !videoRef.current) return
    const video = videoRef.current

    const handleTimeUpdate = () => {
      const t = video.currentTime
      for (const seg of adSegments) {
        if (t >= seg.start && t < seg.end) {
          video.currentTime = seg.end
          setAdSkipped(true)
          setTimeout(() => setAdSkipped(false), 2000)
          break
        }
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [adSegments])

  // 播放进度上报（每5秒）
  useEffect(() => {
    if (!videoRef.current || !movieId) return
    const video = videoRef.current

    const report = () => {
      if (video.currentTime > 0) {
        api.saveHistory({
          movieId,
          title,
          cover,
          episodeName,
          progress: video.currentTime,
          duration: video.duration || 0,
          sources,
          activeSource,
          activeEpisode,
        }).catch(() => {})
      }
    }

    historyTimerRef.current = setInterval(report, 5000)
    return () => {
      if (historyTimerRef.current) clearInterval(historyTimerRef.current)
      report()
    }
  }, [movieId, title, cover, episodeName])

  // 检测广告（仅服务器模式有效，本地模式跳过）
  useEffect(() => {
    if (RUN_MODE !== 'server') return
    if (currentUrl && currentUrl.includes('.m3u8')) {
      fetch(`${API}/cache/detect-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.adSegments?.length > 0) {
            setAdSegments(data.adSegments)
          }
        })
        .catch(() => {})
    }
  }, [currentUrl])

  // 初始化HLS播放器
  useEffect(() => {
    if (!currentUrl || !videoRef.current) return

    const video = videoRef.current
    setPlayError(null)
    setLoading(true)

    // 通用视频错误处理
    const handleVideoError = () => {
      setLoading(false)
      setPlayError('视频加载失败，可能是源地址无效或跨域问题')
    }

    const handleVideoCanPlay = () => {
      setLoading(false)
      setPlayError(null)
    }

    video.addEventListener('error', handleVideoError)
    video.addEventListener('canplay', handleVideoCanPlay)

    if (currentUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hls.loadSource(currentUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data?.fatal) {
          setLoading(false)
          setPlayError(`播放失败: ${data.type || '未知错误'}`)
        }
      })
      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentUrl
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}))
    } else {
      video.src = currentUrl
      video.play().catch(() => {})
    }

    return () => {
      video.removeEventListener('error', handleVideoError)
      video.removeEventListener('canplay', handleVideoCanPlay)
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [currentUrl])

  // 倍速切换
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // 预缓存（仅服务器模式有效，本地模式跳过）
  useEffect(() => {
    if (RUN_MODE !== 'server') return
    if (currentUrl && currentUrl.includes('.m3u8')) {
      fetch(`${API}/precache/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId,
          url: currentUrl,
          title,
          cover,
          episodeName,
        }),
      }).catch(() => {})

      precacheTimerRef.current = setInterval(() => {
        fetchJSON(`${API}/precache/status/${encodeURIComponent(movieId)}`)
          .then((data) => {
            if (data.success) {
              setPrecacheProgress(data.progress ?? null)
            }
          })
          .catch(() => {})
      }, 5000)
    }
    return () => {
      if (precacheTimerRef.current) clearInterval(precacheTimerRef.current)
    }
  }, [currentUrl, movieId, title, cover, episodeName])

  const switchEpisode = (sourceIdx, epIdx) => {
    setActiveSource(sourceIdx)
    setActiveEpisode(epIdx)
    setAdSegments([])
    setPrecacheProgress(null)
  }

  const sendDanmaku = () => {
    if (!danmakuText.trim()) return
    setDanmakuText('')
  }

  // 缓存当前集（本地模式使用 IndexedDB，服务器模式走后端）
  const cacheCurrentEpisode = () => {
    if (!currentUrl || caching) return
    setCaching(true)
    const epName = currentEp?.name || episode || '第1集'
    const cacheId = `${title || 'video'}::${epName}`
    api.cacheDownload({
      id: cacheId,
      sourceUrl: currentUrl,
      url: currentUrl,
      title: title || '未命名视频',
      poster: cover,
      episodeName: epName,
    }, (pct) => {
      setPrecacheProgress(pct)
    })
      .then(data => {
        setCaching(false)
        if (data.success) {
          setPrecacheProgress(100)
          setTimeout(() => setPrecacheProgress(null), 1500)
          // 刷新已缓存剧集标记
          loadCachedEpisodes()
        } else {
          setPrecacheProgress(null)
        }
      })
      .catch(() => {
        setCaching(false)
        setPrecacheProgress(null)
      })
  }

  // 收藏/取消收藏
  const toggleFavorite = () => {
    const action = isFavorited ? api.removeFavorite(movieId) : api.addFavorite({ movieId, title, cover, episodeName })
    action
      .then((data) => {
        if (data.success) setIsFavorited(!isFavorited)
      })
      .catch(() => {})
  }

  const rateOptions = [0.5, 1, 1.25, 1.5, 2]

  return (
    <div className="player-page">
      <div className="player-header">
        <button onClick={() => navigate(-1)} style={{ color: '#fff', display: 'flex' }}>
          {Icons.back}
        </button>
        <span className="player-header-title">
          {title} {currentEp?.name ? `- ${currentEp.name}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={toggleFavorite}
            style={{ color: isFavorited ? 'var(--danger)' : '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 4 }}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            {isFavorited ? Icons.heartFilled : Icons.heart}
          </button>
          <button
            onClick={cacheCurrentEpisode}
            disabled={caching}
            style={{ color: caching ? 'var(--text-dim)' : '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {Icons.download} {caching ? '缓存中...' : '缓存'}
          </button>
          <button
            onClick={() => setDanmakuVisible(!danmakuVisible)}
            style={{ color: danmakuVisible ? 'var(--brand)' : '#fff', fontSize: '13px' }}
          >
            弹幕
          </button>
        </div>
      </div>

      <div className="player-container">
        <video ref={videoRef} playsInline controls style={{ width: '100%', height: '100%' }} />
        {/* 加载状态 */}
        {loading && !playError && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', zIndex: 10, color: '#fff', fontSize: '14px'
          }}>
            <div className="loading"><div className="spinner" /></div>
            <span style={{ marginLeft: '12px' }}>正在加载视频...</span>
          </div>
        )}
        {/* 错误提示 */}
        {playError && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', zIndex: 10, color: '#fff', padding: '20px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>播放出错</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>{playError}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              当前使用的是测试视频源，部分源可能受网络/CDN限制
            </div>
          </div>
        )}
        {/* 广告跳过提示 */}
        {adSkipped && (
          <div className="ad-skip-toast">
            {Icons.skip} 已跳过广告
          </div>
        )}
        {/* 广告标记指示器 */}
        {adSegments.length > 0 && (
          <div className="ad-indicator">
            {Icons.check} 自动去广告已开启 ({adSegments.length}个片段)
          </div>
        )}
        {/* 倍速控制 */}
        <div className="playback-rate-bar">
          {rateOptions.map((rate) => (
            <button
              key={rate}
              className={`playback-rate-btn ${playbackRate === rate ? 'active' : ''}`}
              onClick={() => setPlaybackRate(rate)}
            >
              {rate}x
            </button>
          ))}
        </div>
        {/* 预缓存进度 */}
        {precacheProgress !== null && precacheProgress < 100 && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '280px', maxWidth: '85vw',
            background: 'rgba(15,17,23,0.92)', borderRadius: '14px',
            padding: '16px 20px', zIndex: 10,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>正在缓存视频</span>
              <span style={{ color: 'var(--brand)', fontSize: '15px', fontWeight: 700 }}>{precacheProgress}%</span>
            </div>
            <div style={{
              width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px', overflow: 'hidden'
            }}>
              <div style={{
                width: `${precacheProgress}%`, height: '100%',
                background: `linear-gradient(90deg, var(--brand), #7c5cf5)`,
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
        {precacheProgress === 100 && (
          <div style={{
            position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)', borderRadius: 'var(--radius-md)',
            padding: '8px 20px', zIndex: 10, color: 'var(--success)', fontSize: '13px'
          }}>
            {Icons.check} 缓存完成
          </div>
        )}
        <div className={`danmaku-input ${danmakuVisible ? 'visible' : ''}`}>
          <input
            value={danmakuText}
            onChange={(e) => setDanmakuText(e.target.value)}
            placeholder="发送弹幕..."
            onKeyDown={(e) => e.key === 'Enter' && sendDanmaku()}
          />
          <button onClick={sendDanmaku}>{Icons.send}</button>
        </div>
      </div>

      {/* 播放源切换 */}
      {sources.length > 1 && (
        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>播放源</div>
          <div className="source-tabs">
            {sources.map((s, i) => (
              <button
                key={i}
                className={`source-tab ${activeSource === i ? 'active' : ''}`}
                onClick={() => switchEpisode(i, 0)}
              >
                {s.siteName || `线路${i + 1}`} ({s.episodes?.length || 0}集)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 选集 */}
      {currentSource.episodes?.length > 1 && (
        <EpisodeBar
          episodes={currentSource.episodes}
          activeEpisode={activeEpisode}
          onSelect={(i) => switchEpisode(activeSource, i)}
          cachedEpNames={cachedEpNames}
        />
      )}
    </div>
  )
}

// ===== History Page =====
function HistoryPage() {
  const navigate = useNavigate()
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(true)

  const loadHistory = () => {
    setLoading(true)
    api.getHistory()
      .then((data) => { if (data.success) setHistoryList(data.data || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadHistory() }, [])

  const deleteHistory = (id) => {
    api.deleteHistory(id)
      .then(() => loadHistory())
      .catch(console.error)
  }

  const clearAll = () => {
    api.clearHistory()
      .then(() => loadHistory())
      .catch(console.error)
  }

  const continuePlay = (item) => {
    navigate('/play/aggregate', {
      state: {
        title: item.title,
        cover: item.cover,
        url: '',
        episode: item.episodeName,
        sources: item.sources || [],
        activeSource: item.activeSource || 0,
        activeEpisode: item.activeEpisode || 0,
        resumeProgress: item.progress,
      },
    })
  }

  const formatTime = (seconds) => {
    if (!seconds) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="main">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">观看历史</h2>
          {historyList.length > 0 && (
            <button
              className="btn-secondary"
              onClick={clearAll}
              style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--danger)' }}
            >
              {Icons.trash} 清空全部
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : historyList.length === 0 ? (
          <div className="empty">
            <p>暂无观看历史</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>
              播放影片后会自动记录进度
            </p>
          </div>
        ) : (
          <div className="cache-list">
            {historyList.map((item) => {
              const progressPercent = item.duration > 0 ? (item.progress / item.duration) * 100 : 0
              return (
                <div key={item._id || item.movieId} className="cache-item">
                  <div className="cache-item-poster" onClick={() => continuePlay(item)}>
                    <PosterImg src={item.cover} alt={item.title} />
                  </div>
                  <div className="cache-item-info" style={{ flex: 1 }}>
                    <div className="cache-item-title">{item.title}</div>
                    <div className="cache-item-meta">{item.episodeName}</div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(progressPercent, 100)}%`,
                            height: '100%',
                            background: 'var(--brand)',
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 4 }}>
                        观看到 {formatTime(item.progress)} / {formatTime(item.duration)}
                      </div>
                    </div>
                    <div className="cache-item-actions" style={{ marginTop: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => continuePlay(item)}
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        {Icons.play} 继续播放
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => deleteHistory(item._id || item.movieId)}
                        style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--danger)' }}
                      >
                        {Icons.trash} 删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Favorite Page =====
function FavoritePage() {
  const navigate = useNavigate()
  const [favoriteList, setFavoriteList] = useState([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = () => {
    setLoading(true)
    api.getFavorites()
      .then((data) => { if (data.success) setFavoriteList(data.data || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadFavorites() }, [])

  const unfavorite = (id) => {
    api.removeFavorite(id)
      .then(() => loadFavorites())
      .catch(console.error)
  }

  const playFavorite = (item) => {
    navigate('/play/aggregate', {
      state: {
        title: item.title,
        cover: item.cover,
        url: '',
        episode: item.episodeName,
        sources: [],
        activeSource: 0,
        activeEpisode: 0,
      },
    })
  }

  return (
    <div className="main">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">我的收藏</h2>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : favoriteList.length === 0 ? (
          <div className="empty">
            <p>暂无收藏影片</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>
              播放影片时点击收藏按钮即可添加
            </p>
          </div>
        ) : (
          <div className="cache-list">
            {favoriteList.map((item) => (
              <div key={item._id || item.movieId} className="cache-item">
                <div className="cache-item-poster" onClick={() => playFavorite(item)}>
                    <PosterImg src={item.cover} alt={item.title} />
                  </div>
                <div className="cache-item-info" style={{ flex: 1 }}>
                  <div className="cache-item-title">{item.title}</div>
                  <div className="cache-item-meta">
                    {[item.year, item.rating ? `${item.rating}分` : ''].filter(Boolean).join(' · ')}
                  </div>
                  <div className="cache-item-actions" style={{ marginTop: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => playFavorite(item)}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      {Icons.play} 播放
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => unfavorite(item._id || item.movieId)}
                      style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--danger)' }}
                    >
                      {Icons.heartFilled} 取消收藏
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Cache Page =====
function CachePage() {
  const navigate = useNavigate()
  const [cacheList, setCacheList] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCache = () => {
    setLoading(true)
    api.getCacheList()
      .then(data => { if (data.success) setCacheList(data.data || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCache() }, [])

  const deleteCache = (id) => {
    api.deleteCache(id)
      .then(() => loadCache())
      .catch(console.error)
  }

  // 本地模式：读取 IndexedDB 的 Blob 或 Capacitor 文件 URI 并转为 object URL 播放
  const playLocalCache = async (item) => {
    try {
      const blobOrUri = await getVideoCacheBlob(item._id || item.id)
      if (!blobOrUri) {
        alert('缓存已失效或不存在')
        return
      }

      let playUrl
      // Capacitor 环境返回的是文件 URI (file://...)
      if (typeof blobOrUri === 'string' && blobOrUri.startsWith('file://')) {
        playUrl = blobOrUri
      } else if (blobOrUri instanceof Blob) {
        // 浏览器环境返回 Blob，转为 object URL
        playUrl = URL.createObjectURL(blobOrUri)
      } else if (typeof blobOrUri === 'string') {
        // 已经是字符串 URL
        playUrl = blobOrUri
      } else {
        alert('缓存格式不支持')
        return
      }

      navigate('/play/aggregate', {
        state: {
          title: item.title,
          cover: item.poster || item.cover,
          url: playUrl,
          episode: item.episodeName,
          sources: [{
            siteName: '本地缓存',
            episodes: [{ name: item.episodeName, url: playUrl }]
          }],
          activeSource: 0,
          activeEpisode: 0,
          isLocalObjectUrl: typeof playUrl === 'string' && playUrl.startsWith('blob:'),
        },
      })
    } catch (e) {
      console.error('读取缓存失败', e)
      alert('读取缓存失败')
    }
  }

  const playCache = (item) => {
    if (RUN_MODE === 'local') {
      playLocalCache(item)
    } else {
      navigate('/play/aggregate', {
        state: {
          title: item.title,
          cover: item.cover,
          url: `/api/cache/stream/${item._id}`,
          episode: item.episodeName,
          sources: [{
            siteName: '本地缓存',
            episodes: [{ name: item.episodeName, url: `/api/cache/stream/${item._id}` }]
          }],
          activeSource: 0,
          activeEpisode: 0,
        },
      })
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '--'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const statusMap = {
    downloading: { text: '下载中', color: 'var(--brand)' },
    ready: { text: '已缓存', color: 'var(--success)' },
    error: { text: '下载失败', color: 'var(--danger)' },
  }

  return (
    <div className="main">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">我的缓存</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {cacheList.length} 个影片 · {RUN_MODE === 'local' ? '浏览器存储' : '服务器存储'}
          </span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : cacheList.length === 0 ? (
          <div className="empty">
            <p>暂无缓存影片</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>
              播放影片时点击"缓存"按钮即可下载
            </p>
            <p style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-muted)' }}>
              {RUN_MODE === 'local' ? '浏览器环境下缓存大小受限，较大视频可能无法完整缓存' : '视频将存储在服务器'}
            </p>
          </div>
        ) : (
          <div className="cache-list">
            {cacheList.map(item => {
              const status = statusMap[item.status] || statusMap.ready
              const keyId = item._id || item.id
              return (
                <div key={keyId} className="cache-item">
                  <div className="cache-item-poster" onClick={() => item.status === 'ready' && playCache(item)}>
                    <PosterImg src={item.poster || item.cover} alt={item.title} />
                    <div className="cache-item-status" style={{ background: status.color }}>
                      {status.text}
                    </div>
                  </div>
                  <div className="cache-item-info">
                    <div className="cache-item-title">{item.title}</div>
                    <div className="cache-item-meta">{item.episodeName}</div>
                    <div className="cache-item-meta">{formatSize(item.fileSize)}</div>
                    <div className="cache-item-actions">
                      {item.status === 'ready' && (
                        <button className="btn-secondary" onClick={() => playCache(item)} style={{ padding: '6px 14px', fontSize: '12px' }}>
                          {Icons.play} 播放
                        </button>
                      )}
                      <button className="btn-secondary" onClick={() => deleteCache(item._id || item.id)} style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--danger)' }}>
                        {Icons.trash} 删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Episode Bar (支持拖拽滚动) =====
function EpisodeBar({ episodes, activeEpisode, onSelect, cachedEpNames }) {
  const barRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const isCached = (epName) => {
    return cachedEpNames && cachedEpNames.has(epName)
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.pageX - barRef.current.offsetLeft)
    setScrollLeft(barRef.current.scrollLeft)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - barRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    barRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)

  return (
    <div
      ref={barRef}
      className="player-episode-bar"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {episodes.map((ep, i) => {
        const cached = isCached(ep.name)
        return (
        <button
          key={i}
          className={`player-ep-btn ${i === activeEpisode ? 'active' : ''}`}
          onClick={() => onSelect(i)}
          style={cached ? { opacity: 0.45, background: 'rgba(52,199,123,0.12)', borderColor: 'rgba(52,199,123,0.25)' } : {}}
          title={cached ? '已缓存' : ''}
        >
          {cached ? '✓ ' : ''}{ep.name}
        </button>
        )
      })}
    </div>
  )
}

// ===== CMS Source Manager (二级菜单) =====
function CmsSourceManager({ sources, onToggle, onDelete, onAdd, newSource, setNewSource }) {
  const [activeTab, setActiveTab] = useState('enabled')
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState(null)
  const [checkingProgress, setCheckingProgress] = useState(0)

  const enabledSources = sources.filter(s => s.enabled)
  const disabledSources = sources.filter(s => !s.enabled)

  const runBatchCheck = async () => {
    const allSources = [...enabledSources, ...disabledSources]
    if (allSources.length === 0) return

    setChecking(true)
    setCheckResults(null)
    setCheckingProgress(0)

    const results = {}
    let checked = 0
    const total = allSources.length

    // 使用 cmsEngine 的代理 URL 逻辑来测试
    const CORS_PROXY = localStorage.getItem('corsProxy')
    const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    let proxy = CORS_PROXY
    if (IS_DEV && !proxy) proxy = '/cms-proxy/'

    const testSource = async (source) => {
      try {
        let testUrl = `${source.baseUrl}/?ac=videolist&pg=1&pagesize=1`
        if (proxy) {
          if (proxy.startsWith('/cms-proxy/')) {
            testUrl = `${proxy}${encodeURIComponent(testUrl)}`
          } else if (proxy.includes('?')) {
            testUrl = `${proxy}url=${encodeURIComponent(testUrl)}`
          } else {
            testUrl = `${proxy}?url=${encodeURIComponent(testUrl)}`
          }
        }
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(testUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch (e) { throw new Error('Invalid JSON') }
        return { ok: !!(data && data.list) }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    }

    const batch = async () => {
      // 并发测试，每批5个
      const batchSize = 5
      for (let i = 0; i < total; i += batchSize) {
        const batchSources = allSources.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batchSources.map(async (s) => {
            const r = await testSource(s)
            checked++
            setCheckingProgress(Math.round((checked / total) * 100))
            return { name: s.name, ...r }
          })
        )
        batchResults.forEach(r => { results[r.name] = r })
      }
      setCheckResults(results)
    }

    await batch()
    // 自动禁用失败的源
    const failedNames = new Set(
      Object.entries(results).filter(([_, r]) => !r.ok).map(([name]) => name)
    )
    if (failedNames.size > 0) {
      for (const name of failedNames) {
        const s = sources.find(s => s.name === name)
        if (s && s.enabled) {
          onToggle(name)
        }
      }
    }
    setChecking(false)
  }

  const tabStyle = (tab) => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    background: activeTab === tab ? 'var(--brand)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
    transition: 'all var(--transition)',
    whiteSpace: 'nowrap'
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>CMS源管理</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <button style={tabStyle('enabled')} onClick={() => setActiveTab('enabled')}>
              已启用 ({enabledSources.length})
            </button>
            <button style={tabStyle('disabled')} onClick={() => setActiveTab('disabled')}>
              已停用 ({disabledSources.length})
            </button>
            <button style={tabStyle('add')} onClick={() => setActiveTab('add')}>
              {Icons.plus} 添加
            </button>
          </div>
          <button
            onClick={runBatchCheck}
            disabled={checking}
            style={{
              padding: '8px 14px', fontSize: '13px', fontWeight: 600,
              borderRadius: 'var(--radius-md)', border: '1px solid var(--brand)',
              background: checking ? 'var(--bg-secondary)' : 'var(--brand)',
              color: checking ? 'var(--text-muted)' : '#fff',
              cursor: checking ? 'default' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all var(--transition)'
            }}
          >
            {checking ? `检测中 ${checkingProgress}%` : '一键检测'}
          </button>
        </div>
      </div>

      {/* 检测结果面板 */}
      {checkResults && (
        <div style={{
          marginBottom: 12, padding: '12px 16px', background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)', border: '1px solid var(--border-light)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>
            检测结果：
            <span style={{ color: 'var(--success)', marginLeft: 8 }}>
              {Object.values(checkResults).filter(r => r.ok).length} 个可用
            </span>
            <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
              {Object.values(checkResults).filter(r => !r.ok).length} 个失败（已自动禁用）
            </span>
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: '12px' }}>
            {Object.entries(checkResults).map(([name, r]) => (
              <div key={name} style={{
                padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8,
                color: r.ok ? 'var(--success)' : 'var(--danger)'
              }}>
                <span>{r.ok ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500 }}>{name}</span>
                {!r.ok && r.error && (
                  <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>({r.error})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'enabled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {enabledSources.length === 0 ? (
            <div className="empty" style={{ padding: '24px' }}>
              <p>暂无启用的源</p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-dim)' }}>切换到"已停用"标签启用源</p>
            </div>
          ) : (
            enabledSources.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                <button
                  onClick={() => onToggle(s.name)}
                  style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  已启用
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baseUrl}</div>
                </div>
                <button onClick={() => onDelete(s.name)} style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px' }}>
                  {Icons.trash}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'disabled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disabledSources.length === 0 ? (
            <div className="empty" style={{ padding: '24px' }}>
              <p>暂无停用的源</p>
            </div>
          ) : (
            disabledSources.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                <button
                  onClick={() => onToggle(s.name)}
                  style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, background: 'var(--text-dim)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  已停用
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baseUrl}</div>
                </div>
                <button onClick={() => onDelete(s.name)} style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px' }}>
                  {Icons.trash}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <form onSubmit={onAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <input
            placeholder="源名称"
            value={newSource.name}
            onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))}
            style={{ flex: 1, minWidth: 120, padding: '8px 12px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <input
            placeholder="API地址"
            value={newSource.baseUrl}
            onChange={e => setNewSource(p => ({ ...p, baseUrl: e.target.value }))}
            style={{ flex: 2, minWidth: 200, padding: '8px 12px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <button type="submit" className="btn-play" style={{ padding: '8px 16px', fontSize: '13px' }}>
            {Icons.plus} 添加
          </button>
        </form>
      )}
    </div>
  )
}

// ===== Settings Page =====
// ===== 缓存设置块 =====
function CacheSettingsBlock() {
  const [cacheDir, setCacheDirState] = useState(getCacheDir())
  const [sizeLimit, setSizeLimit] = useState(String(getCacheSizeLimit()))
  const [totalSize, setTotalSize] = useState(0)
  const [saving, setSaving] = useState(false)
  const [availableStorage, setAvailableStorage] = useState([])
  const [selectedStorage, setSelectedStorage] = useState('Application')
  const [browsingPath, setBrowsingPath] = useState('')
  const [subDirs, setSubDirs] = useState([])
  const [showBrowser, setShowBrowser] = useState(false)
  const [newDirName, setNewDirName] = useState('')

  useEffect(() => {
    if (RUN_MODE === 'local') {
      getVideoCacheTotalSize().then(s => setTotalSize(s))
    }
    // 加载存储配置和可用目录
    const info = getCacheStorageInfo()
    setSelectedStorage(info.baseDirKey || 'Application')
    getStorageDirectories().then(dirs => setAvailableStorage(dirs))
  }, [])

  const handleBrowse = async (baseDirKey, subPath) => {
    const result = await browseDirectory(baseDirKey, subPath)
    setBrowsingPath(subPath || '')
    setSubDirs(result.dirs || [])
    setShowBrowser(true)
  }

  const handleSelectDir = (path) => {
    setCacheDirState(path)
    setShowBrowser(false)
  }

  const handleParentDir = async () => {
    if (!browsingPath) return
    const parts = browsingPath.split('/')
    parts.pop()
    const parentPath = parts.join('/')
    await handleBrowse(selectedStorage, parentPath)
  }

  const handleCreateNewDir = async () => {
    if (!newDirName.trim()) return
    const fullPath = browsingPath ? browsingPath + '/' + newDirName.trim() : newDirName.trim()
    const ok = await createCacheDirectory(selectedStorage, fullPath)
    if (ok) {
      setCacheDirState(fullPath)
      setShowBrowser(false)
      setNewDirName('')
    } else {
      alert('创建目录失败')
    }
  }

  const saveCacheConfig = () => {
    setSaving(true)
    const sizeMb = parseInt(sizeLimit, 10)
    // 保存存储类型和子目录
    setCacheStorageInfo(selectedStorage, cacheDir)
    setCacheDir(cacheDir || 'video_cache')
    setCacheSizeLimit(isNaN(sizeMb) || sizeMb <= 0 ? 2048 : sizeMb)
    api.saveCacheSettings({
      dir: cacheDir,
      sizeLimit: isNaN(sizeMb) || sizeMb <= 0 ? 2048 : sizeMb,
    })
      .then(() => setSaving(false))
      .catch(() => setSaving(false))
  }

  const clearAllCache = () => {
    if (!window.confirm('确定清空全部缓存视频？此操作不可恢复。')) return
    clearVideoCache().then(() => setTotalSize(0))
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const itemStyle = { padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }
  const inputStyle = { width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }

  const storageLabels = {
    'Application': '应用私有目录',
    'ExternalStorage': '手机外部存储',
    'External': 'SD卡/外部存储'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 存储位置选择 */}
      <div style={itemStyle}>
        <div style={{ fontSize: '14px', marginBottom: 8 }}>存储位置</div>
        {availableStorage.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {availableStorage.map(s => (
              <label key={s.key} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: selectedStorage === s.key ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                border: selectedStorage === s.key ? '1px solid var(--brand)' : '1px solid var(--border)',
                transition: 'all var(--transition)'
              }}>
                <input type="radio" name="storageType" checked={selectedStorage === s.key}
                  onChange={() => setSelectedStorage(s.key)} style={{ accentColor: 'var(--brand)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{s.description}</div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {isCapacitor() ? '加载存储目录中...' : '浏览器模式：数据存储在浏览器 IndexedDB 中'}
          </div>
        )}
      </div>

      {/* 缓存子目录 */}
      <div style={itemStyle}>
        <div style={{ fontSize: '14px', marginBottom: 8 }}>缓存子目录</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="video_cache"
            value={cacheDir}
            onChange={e => setCacheDirState(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => handleBrowse(selectedStorage, '')}
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {Icons.folder} 浏览
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: 6 }}>
          当前路径：{storageLabels[selectedStorage] || selectedStorage}/{cacheDir}
        </div>
      </div>

      {/* 目录浏览器弹窗 */}
      {showBrowser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setShowBrowser(false)}>
          <div style={{
            width: '100%', maxWidth: 480, maxHeight: '70vh', background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '0 0 20px 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* 头部 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>选择目录</div>
                <button onClick={() => setShowBrowser(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: 4 }}>
                当前位置：{storageLabels[selectedStorage] || selectedStorage}/{browsingPath || '根目录'}
              </div>
            </div>

            {/* 目录列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
              {browsingPath && (
                <button onClick={handleParentDir} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 20px',
                  border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: '13px'
                }}>
                  {Icons.folder} ../
                </button>
              )}
              {subDirs.length === 0 && !browsingPath ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                  {availableStorage.length > 0 ? '此目录下暂无子目录' : '目录列表加载中...'}
                </div>
              ) : subDirs.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                  此目录为空
                </div>
              ) : (
                subDirs.map(d => (
                  <div key={d.path} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                    borderBottom: '1px solid var(--border-light)'
                  }}>
                    <button onClick={() => handleBrowse(selectedStorage, d.path)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 10, border: 'none',
                      background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px',
                      textAlign: 'left', padding: '4px 0'
                    }}>
                      {Icons.folder} {d.name}
                    </button>
                    <button onClick={() => handleSelectDir(d.path)} style={{
                      padding: '4px 12px', fontSize: '11px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer'
                    }}>
                      选择
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 创建新目录 */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="新建目录名称"
                value={newDirName}
                onChange={e => setNewDirName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleCreateNewDir}
                disabled={!newDirName.trim()}
                style={{
                  padding: '8px 14px', fontSize: '13px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--brand)', background: newDirName.trim() ? 'var(--brand)' : 'var(--bg-secondary)',
                  color: newDirName.trim() ? '#fff' : 'var(--text-dim)', cursor: newDirName.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap'
                }}>
                {Icons.plus} 创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 缓存大小设置 */}
      <div style={itemStyle}>
        <div style={{ fontSize: '14px', marginBottom: 8 }}>缓存大小上限 (MB)</div>
        <input
          type="number"
          min="64"
          max="200000"
          value={sizeLimit}
          onChange={e => setSizeLimit(e.target.value)}
          style={inputStyle}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 6 }}>
          超过上限后会自动删除最旧的视频
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 8 }}>
          当前已占用：{formatBytes(totalSize)} / {sizeLimit} MB
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn-primary"
          onClick={saveCacheConfig}
          disabled={saving}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        {RUN_MODE === 'local' && (
          <button
            onClick={clearAllCache}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
          >
            清空缓存
          </button>
        )}
      </div>
    </div>
  )
}

function SettingsPage() {
  const [sources, setSources] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [newSource, setNewSource] = useState({ name: '', baseUrl: '', type: 'apple_cms' })
  const [saving, setSaving] = useState(false)
  const [serverStatus, setServerStatus] = useState('idle') // 'idle' | 'checking' | 'connected' | 'disconnected'

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    setLoading(true)
    api.getSettings()
      .then(data => {
        if (data.success) {
          setSources(data.data.sources || [])
          setSettings(data.data.settings || {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const toggleSource = (name) => {
    api.toggleSource(name)
      .then(() => loadSettings())
      .catch(console.error)
  }

  const deleteSource = (name) => {
    if (!window.confirm(`确定删除源 "${name}" 吗？`)) return
    api.deleteSource(name)
      .then(() => loadSettings())
      .catch(console.error)
  }

  const addSource = (e) => {
    e.preventDefault()
    if (!newSource.name || !newSource.baseUrl) return
    api.addSource(newSource)
      .then(() => {
        setNewSource({ name: '', baseUrl: '', type: 'apple_cms' })
        loadSettings()
      })
      .catch(console.error)
  }

  const saveSettings = () => {
    setSaving(true)
    // 保存CORS代理设置
    const corsProxyInput = document.getElementById('cors-proxy-input')
    if (corsProxyInput) {
      const proxy = corsProxyInput.value.trim()
      if (proxy) {
        localStorage.setItem('corsProxy', proxy)
      } else {
        localStorage.removeItem('corsProxy')
      }
    }
    api.savePlaySettings(settings)
      .then(() => setSaving(false))
      .catch(() => setSaving(false))
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="main"><div className="loading"><div className="spinner" /></div></div>

  return (
    <div className="main">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">{Icons.settings} 设置</h2>
        </div>

        {/* CMS源管理 */}
        <div style={{ marginBottom: 32 }}>
          <CmsSourceManager
            sources={sources}
            onToggle={toggleSource}
            onDelete={deleteSource}
            onAdd={addSource}
            newSource={newSource}
            setNewSource={setNewSource}
          />
        </div>

        {/* 播放设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>播放设置</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>默认倍速</span>
              <select
                value={settings.defaultPlaybackRate || 1}
                onChange={e => updateSetting('defaultPlaybackRate', parseFloat(e.target.value))}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>自动跳过广告</span>
              <button
                onClick={() => updateSetting('autoSkipAds', !settings.autoSkipAds)}
                style={{
                  padding: '5px 14px', borderRadius: 'var(--radius-xl)', fontSize: '12px', fontWeight: 600,
                  background: settings.autoSkipAds ? 'var(--success)' : 'var(--text-dim)', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {settings.autoSkipAds ? '开启' : '关闭'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>自动预缓存</span>
              <button
                onClick={() => updateSetting('autoPrecache', !settings.autoPrecache)}
                style={{
                  padding: '5px 14px', borderRadius: 'var(--radius-xl)', fontSize: '12px', fontWeight: 600,
                  background: settings.autoPrecache ? 'var(--success)' : 'var(--text-dim)', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {settings.autoPrecache ? '开启' : '关闭'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>预缓存时长</span>
              <select
                value={settings.preloadSeconds || 60}
                onChange={e => updateSetting('preloadSeconds', parseInt(e.target.value))}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
                <option value={120}>120秒</option>
              </select>
            </div>
          </div>
        </div>

        {/* 缓存设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>缓存设置</h3>
          <CacheSettingsBlock />
        </div>

        {/* 运行模式切换 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>运行模式</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { setRunMode('local'); window.location.reload() }}
              style={{
                flex: 1, padding: '14px', borderRadius: 'var(--radius)', border: `2px solid ${RUN_MODE === 'local' ? 'var(--brand)' : 'var(--border)'}`,
                background: RUN_MODE === 'local' ? 'var(--brand)' : 'var(--bg-secondary)',
                color: RUN_MODE === 'local' ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer', textAlign: 'center', transition: 'all var(--transition)'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>本地模式</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>无需后端服务器，APP 直接连接影视源</div>
            </button>
            <button
              onClick={() => { setRunMode('server'); window.location.reload() }}
              style={{
                flex: 1, padding: '14px', borderRadius: 'var(--radius)', border: `2px solid ${RUN_MODE === 'server' ? 'var(--brand)' : 'var(--border)'}`,
                background: RUN_MODE === 'server' ? 'var(--brand)' : 'var(--bg-secondary)',
                color: RUN_MODE === 'server' ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer', textAlign: 'center', transition: 'all var(--transition)'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>服务器模式</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>连接自建后端，支持缓存、多设备同步</div>
            </button>
          </div>
        </div>

        {/* 服务器设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>服务器设置</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '14px', marginBottom: 8, color: 'var(--text-muted)' }}>服务器地址</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="例如：http://192.168.1.100:3000"
                  value={localStorage.getItem('apiBaseUrl') || ''}
                  onChange={e => {
                    const val = e.target.value.trim()
                    if (val) {
                      localStorage.setItem('apiBaseUrl', val)
                    } else {
                      localStorage.removeItem('apiBaseUrl')
                    }
                    // 触发重新渲染以更新 API 地址
                    window.location.reload()
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: '13px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)'
                  }}
                />
                <button
                  onClick={async () => {
                    const baseUrl = localStorage.getItem('apiBaseUrl') || ''
                    const healthUrl = baseUrl ? `${baseUrl}/api/health` : '/api/health'
                    setServerStatus('checking')
                    try {
                      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
                      if (res.ok) {
                        setServerStatus('connected')
                      } else {
                        setServerStatus('disconnected')
                      }
                    } catch {
                      setServerStatus('disconnected')
                    }
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  检测连接
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: '13px' }}>
                {serverStatus === 'connected' && (
                  <span style={{ color: 'var(--success)' }}>已连接 - 服务器正常</span>
                )}
                {serverStatus === 'disconnected' && (
                  <span style={{ color: 'var(--danger)' }}>未连接 - 无法访问服务器</span>
                )}
                {serverStatus === 'checking' && (
                  <span style={{ color: 'var(--brand)' }}>检测中...</span>
                )}
                {serverStatus === 'idle' && (
                  <span style={{ color: 'var(--text-dim)' }}>点击"检测连接"测试服务器是否可达</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CORS代理设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>CORS代理设置</h3>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '14px', marginBottom: 8, color: 'var(--text-muted)' }}>
              代理地址（解决跨域问题）
            </div>
            <input
              type="text"
              placeholder="例如：https://corsproxy.io/? 或留空不使用代理"
              defaultValue={localStorage.getItem('corsProxy') || ''}
              id="cors-proxy-input"
              style={{
                width: '100%', padding: '10px 12px', fontSize: '13px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                marginBottom: 8
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              如果影视源无法加载，请配置CORS代理。可使用公开代理如：<br />
              <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>https://corsproxy.io/?</code><br />
              或部署自己的代理服务。配置后刷新页面生效。
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>关于</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <p>影视聚合播放器 v1.0.0</p>
            <p>聚合多源影视资源，智能去广告，离线缓存</p>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-play"
          style={{ padding: '12px 32px', fontSize: '14px', width: '100%' }}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

// ===== App =====
function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // Android 返回按钮/侧滑手势处理
  useEffect(() => {
    if (isCapacitor()) {
      const handleBackButton = () => {
        // 如果当前在根路径(首页)，则退出应用
        if (location.pathname === '/') {
          // App.exitApp() 来自 @capacitor/app
          window.Capacitor.Plugins.App?.exitApp?.()
        } else {
          // 否则导航回上一页
          navigate(-1)
        }
      }

      try {
        const App = window.Capacitor.Plugins.App
        if (App && App.addListener) {
          App.addListener('backButton', handleBackButton)
          return () => {
            App.removeAllListeners?.()
          }
        }
      } catch (e) {
        console.error('返回按钮监听失败', e)
      }
    }
  }, [location.pathname, navigate])

  // 禁止 WebView 系统的后退行为，由 React Router 管理
  useEffect(() => {
    if (isCapacitor()) {
      const handler = (e) => {
        e.preventDefault()
      }
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [])

  return (
    <div className="app">
      <Header />
      <div className="main-scroll">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/favorite" element={<FavoritePage />} />
          <Route path="/cache" element={<CachePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/play/aggregate" element={<PlayerPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
