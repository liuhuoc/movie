# 影视聚合

> 自用在线影视聚合播放器 — 无需登录，开箱即用

## 项目结构

```
movie-app/
├── backend/          # Node.js 后端（Express + MongoDB + WebSocket）
├── web/              # React 网页版前端（Vite + React Router + HLS.js）
├── spider/           # Python 爬虫（Scrapy）
├── client/           # Flutter 移动端（可选）
└── docker-compose.yml
```

## 快速开始

### 方式一：Docker 一键部署（推荐）

```bash
cd movie-app

# 1. 启动数据库和后端
docker-compose up -d

# 2. 运行爬虫抓取数据（在宿主机）
cd spider
pip install -r requirements.txt
python run_spider.py douban --type movie --pages 5

# 3. 构建前端并部署
cd ../web
npm install
npm run build
# 将 dist 目录复制到 backend 上层（后端会自动托管静态文件）
cp -r dist ../backend/

# 4. 重启后端
docker-compose restart backend

# 5. 访问 http://localhost:3000
```

### 方式二：本地开发

```bash
# 终端1：启动数据库
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 终端2：启动后端
cd backend
npm install
cp .env.example .env
npm run dev

# 终端3：启动前端开发服务器
cd web
npm install
npm run dev
# 访问 http://localhost:5173（自动代理API到3000端口）

# 终端4：运行爬虫
cd spider
pip install -r requirements.txt
python run_spider.py douban --type movie --pages 5
```

## 页面说明

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 影片推荐、分类浏览 |
| 分类 | `/category` | 按类型筛选（电影/电视剧/综艺/动漫） |
| 搜索 | `/search?q=关键词` | 关键词搜索影片 |
| 详情 | `/movie/:id` | 影片信息、选集、多源切换 |
| 播放 | `/play/:id` | HLS视频播放、弹幕、集数切换 |

## 技术栈

| 层级 | 技术 |
|------|------|
| Web前端 | React 18 + Vite + React Router 6 + HLS.js |
| 后端 | Node.js + Express + Mongoose + WebSocket |
| 数据库 | MongoDB + Redis |
| 爬虫 | Python + Scrapy |

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/movies` | GET | 影片列表（支持 type/category/year/sort/limit 筛选） |
| `/api/movies/search?q=关键词` | GET | 搜索影片 |
| `/api/movies/:id` | GET | 影片详情 |
| `/api/movies/recommend/list` | GET | 推荐影片 |
| `/api/danmaku/:videoId` | GET | 获取弹幕 |
| `/api/danmaku` | POST | 发送弹幕 |
| `/api/health` | GET | 健康检查 |

## 注意事项

1. 本项目仅供个人学习和自用
2. 爬虫请遵守目标网站的 robots.txt，控制频率
3. 生产部署建议配置 Nginx 反向代理和 HTTPS
