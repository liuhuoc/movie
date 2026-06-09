const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const setupWebSocket = require('./config/websocket');

// 路由
const movieRoutes = require('./routes/movies');
const danmakuRoutes = require('./routes/danmaku');
const searchRoutes = require('./routes/search');
const cacheRoutes = require('./routes/cache');
const historyRoutes = require('./routes/history');
const favoriteRoutes = require('./routes/favorite');
const precacheRoutes = require('./routes/precache');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// 限流（放宽限制，自用场景）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});
app.use(limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接
connectDB();
connectRedis();

// API路由（无需认证）
app.use('/api/movies', movieRoutes);
app.use('/api/danmaku', danmakuRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/favorite', favoriteRoutes);
app.use('/api/precache', precacheRoutes);
app.use('/api/settings', settingsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（Web前端）
const WEB_DIST = path.join(__dirname, '../../web/dist');
app.use(express.static(WEB_DIST));

// SPA fallback：所有非API请求返回index.html（必须放在最后）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(WEB_DIST, 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

const server = app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看网页版`);
});

// WebSocket
setupWebSocket(server);

module.exports = app;
