/**
 * Capacitor 文件系统存储服务
 * 使用设备文件系统存储视频文件，支持大容量缓存
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

// 平台检测
const isCapacitor = () => {
  return typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.Plugins !== undefined
}

// 存储目录名
const VIDEO_DIR = 'video_cache'
const META_DIR = 'video_meta'
const META_FILE = 'cache_index.json'

// 获取存储基础路径（仅用于显示）
export async function getStoragePath() {
  try {
    const result = await Filesystem.getUri({
      directory: Directory.Application,
      path: ''
    })
    return result.uri
  } catch (e) {
    return '应用存储目录'
  }
}

// 确保目录存在
async function ensureDir(dir) {
  try {
    const path = `${dir}`
    await Filesystem.mkdir({
      directory: Directory.Application,
      path: path,
      recursive: true
    })
    return path
  } catch (e) {
    // 目录可能已存在
    return dir
  }
}

// 读取索引文件
async function readIndex() {
  try {
    const content = await Filesystem.readFile({
      directory: Directory.Application,
      path: `${META_DIR}/${META_FILE}`,
      encoding: Encoding.UTF8
    })
    return JSON.parse(content)
  } catch (e) {
    return []
  }
}

// 写入索引文件
async function writeIndex(index) {
  try {
    await ensureDir(META_DIR)
    await Filesystem.writeFile({
      directory: Directory.Application,
      path: `${META_DIR}/${META_FILE}`,
      data: JSON.stringify(index, null, 2),
      encoding: Encoding.UTF8
    })
  } catch (e) {
    console.error('写入索引失败', e)
  }
}

// 获取视频列表
export async function getVideoCacheList() {
  try {
    const index = await readIndex()
    return index.map(item => ({
      _id: item.id,
      id: item.id,
      title: item.title,
      episodeName: item.episodeName,
      poster: item.poster,
      fileSize: item.fileSize,
      mimeType: item.mimeType || 'video/mp4',
      status: 'ready',
      sourceUrl: item.sourceUrl,
      createdAt: item.createdAt,
      filePath: item.filePath
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  } catch (e) {
    console.error('读取视频列表失败', e)
    return []
  }
}

// 获取单个视频的 Blob URL（用于播放）
export async function getVideoCacheUrl(id) {
  try {
    const index = await readIndex()
    const item = index.find(i => i.id === id)
    if (!item) return null

    const fileUri = await Filesystem.getUri({
      directory: Directory.Application,
      path: item.filePath
    })

    return fileUri.uri
  } catch (e) {
    console.error('获取视频URL失败', e)
    return null
  }
}

// 删除单个视频
export async function deleteVideoCache(id) {
  try {
    const index = await readIndex()
    const itemIndex = index.findIndex(i => i.id === id)
    if (itemIndex === -1) return { success: false, error: '视频不存在' }

    const item = index[itemIndex]

    // 删除文件
    try {
      await Filesystem.deleteFile({
        directory: Directory.Application,
        path: item.filePath
      })
    } catch (e) {
      // 文件可能不存在
    }

    // 从索引中移除
    index.splice(itemIndex, 1)
    await writeIndex(index)

    return { success: true }
  } catch (e) {
    console.error('删除视频失败', e)
    return { success: false, error: e.message }
  }
}

// 清空所有缓存
export async function clearVideoCache() {
  try {
    const index = await readIndex()

    // 删除所有文件
    for (const item of index) {
      try {
        await Filesystem.deleteFile({
          directory: Directory.Application,
          path: item.filePath
        })
      } catch (e) {
        // 忽略删除错误
      }
    }

    // 清空索引
    await writeIndex([])

    return { success: true }
  } catch (e) {
    console.error('清空缓存失败', e)
    return { success: false, error: e.message }
  }
}

// 计算总缓存大小
export async function getVideoCacheTotalSize() {
  try {
    const index = await readIndex()
    return index.reduce((total, item) => total + (item.fileSize || 0), 0)
  } catch (e) {
    return 0
  }
}

// 保存视频到缓存
export async function saveVideoCache(meta, blob) {
  try {
    const id = meta.id || `${meta.title}::${meta.episodeName}::${Date.now()}`
    const ext = getExtensionFromMime(meta.mimeType || 'video/mp4')
    const fileName = `${id}.${ext}`
    const filePath = `${VIDEO_DIR}/${fileName}`

    // 确保目录存在
    await ensureDir(VIDEO_DIR)

    // 将 Blob 转为 Base64
    const base64 = await blobToBase64(blob)

    // 写入文件
    await Filesystem.writeFile({
      directory: Directory.Application,
      path: filePath,
      data: base64,
      encoding: Encoding.UTF8
    })

    // 更新索引
    const index = await readIndex()
    const existingIndex = index.findIndex(i => i.id === id)

    const record = {
      id: id,
      title: meta.title || '未命名视频',
      episodeName: meta.episodeName || '',
      poster: meta.poster || '',
      sourceUrl: meta.sourceUrl || '',
      mimeType: meta.mimeType || 'video/mp4',
      fileSize: blob.size,
      filePath: filePath,
      createdAt: meta.createdAt || Date.now()
    }

    if (existingIndex >= 0) {
      // 更新现有记录
      const oldPath = index[existingIndex].filePath
      index[existingIndex] = record
      // 删除旧文件
      if (oldPath !== filePath) {
        try {
          await Filesystem.deleteFile({
            directory: Directory.Application,
            path: oldPath
          })
        } catch (e) {}
      }
    } else {
      index.push(record)
    }

    await writeIndex(index)

    return { success: true, id: id }
  } catch (e) {
    console.error('保存视频失败', e)
    return { success: false, error: e.message }
  }
}

// 从 URL 下载并缓存视频
export async function downloadAndCacheVideo(meta, onProgress) {
  try {
    const controller = new AbortController()
    const resp = await fetch(meta.sourceUrl, {
      signal: controller.signal,
      headers: meta.headers || {}
    })

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`)
    }

    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10)
    const reader = resp.body ? resp.body.getReader() : null
    const mimeType = resp.headers.get('content-type') || 'video/mp4'

    let received = 0
    const chunks = []

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (contentLength && onProgress) {
          onProgress(Math.min(99, (received / contentLength) * 100))
        }
      }
    } else {
      const buf = await resp.arrayBuffer()
      chunks.push(new Uint8Array(buf))
      received = buf.byteLength
    }

    const blob = new Blob(chunks, { type: mimeType })

    const result = await saveVideoCache({
      ...meta,
      mimeType: mimeType
    }, blob)

    if (onProgress) onProgress(100)

    return result
  } catch (e) {
    console.error('下载视频失败', e)
    return { success: false, error: e.message }
  }
}

// 工具函数：获取文件扩展名
function getExtensionFromMime(mimeType) {
  const map = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    'application/x-mpegURL': 'm3u8',
    'video/mp2t': 'ts'
  }
  return map[mimeType] || 'mp4'
}

// 工具函数：Blob 转 Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 工具函数：Base64 转 Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

// 获取缓存设置
export function getCacheDir() {
  try {
    return localStorage.getItem('cacheDir') || 'video_cache'
  } catch (e) {
    return 'video_cache'
  }
}

export function setCacheDir(dir) {
  try {
    localStorage.setItem('cacheDir', dir || 'video_cache')
  } catch (e) {
    console.error('设置缓存目录失败', e)
  }
}

export function getCacheSizeLimit() {
  try {
    const v = parseInt(localStorage.getItem('cacheSizeLimit'), 10)
    // 安卓文件系统缓存可以设置得很大，默认 2GB
    return (v > 0 && v <= 200000) ? v : 2048
  } catch (e) {
    return 2048
  }
}

export function setCacheSizeLimit(mb) {
  try {
    const v = parseInt(mb, 10)
    localStorage.setItem('cacheSizeLimit', String(v))
  } catch (e) {
    console.error('设置缓存大小失败', e)
  }
}
