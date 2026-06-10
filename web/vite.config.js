import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CMS 源代理中间件：转发 /cms-proxy/https://target.com/path 到目标地址
// 解决浏览器直接请求 CMS 源的 CORS 跨域问题
function cmsProxyPlugin() {
  return {
    name: 'cms-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/cms-proxy', async (req, res) => {
        // 响应 JSON 错误的帮助函数
        const sendError = (statusCode, msg) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.statusCode = statusCode
          res.end(JSON.stringify({ code: 0, msg: String(msg), list: [] }))
        }

        try {
          // 解析目标URL：/cms-proxy/https%3A%2F%2Ftarget.com%2Fpath
          let rawUrl = req.url.replace(/^\/+/, '') // 去掉开头的所有 /
          let targetUrl = rawUrl

          // 先尝试解码一层，如果解码后才是完整 URL
          try {
            const decoded = decodeURIComponent(rawUrl)
            if (decoded.startsWith('http')) {
              targetUrl = decoded
            }
          } catch (e) {
            // 解码失败，保持原样
          }

          if (!targetUrl || !targetUrl.startsWith('http')) {
            sendError(400, 'Invalid URL: ' + targetUrl)
            return
          }

          const controller = new AbortController()
          // 超时 18 秒，比前端的 15 秒略短，保证代理先超时而不是连接被断
          const timeoutId = setTimeout(() => controller.abort(), 18000)

          const proxyRes = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            },
          })

          clearTimeout(timeoutId)

          // 转发响应头
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.statusCode = 200 // 总是返回 200，让前端通过 code 字段判断业务状态

          let text = await proxyRes.text()

          // 清除 BOM / PHP 标签 / 前后空白
          text = text
            .replace(/^\uFEFF/, '')
            .replace(/^\s*<\?php[\s\S]*?\?>\s*/, '')
            .trim()

          // 如果开头不是 JSON 对象/数组，尝试提取 JSON 部分
          if (!text.startsWith('{') && !text.startsWith('[')) {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              text = jsonMatch[0]
            }
          }

          // 验证 JSON 是否合法，非法则返回空数据
          try {
            JSON.parse(text)
            res.end(text)
          } catch (_) {
            res.end(JSON.stringify({ code: 0, msg: 'Invalid JSON from source', list: [] }))
          }
        } catch (err) {
          const isAbort = err.name === 'AbortError' || (err.message && err.message.includes('aborted'))
          sendError(200, isAbort ? 'Request timeout' : 'Proxy failed: ' + err.message)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cmsProxyPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    base: './',
    outDir: 'dist',
  },
})
