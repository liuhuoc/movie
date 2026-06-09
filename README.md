# Movie Aggregator

> 多端影视资源聚合系统 — 聚合 40+ CMS 影视源，统一搜索、浏览与播放

## 项目架构

```
movie-app/
├── backend/                    # Node.js 后端服务
│   ├── src/
│   │   ├── app.js              #   应用入口（Express + WebSocket）
│   │   ├── config/             #   配置层（数据库 / Redis / WebSocket）
│   │   ├── middleware/         #   中间件（JWT 认证）
│   │   ├── models/             #   数据模型（Movie / Danmaku / User）
│   │   ├── routes/             #   API 路由（11 个模块）
│   │   └── services/           #   核心服务（CMS 聚合引擎）
│   ├── data/                   #   运行时数据（配置 / 缓存）
│   ├── Dockerfile
│   └── package.json
│
├── web/                        # React Web 前端
│   ├── src/
│   │   ├── App.jsx             #   单文件应用（全部页面与组件）
│   │   ├── main.jsx            #   React 挂载入口
│   │   └── index.css            #   完整设计系统（CSS 变量 + 响应式）
│   ├── android/                #   Capacitor Android 工程（APK 打包）
│   ├── capacitor.config.json
│   └── package.json
│
├── client/                     # Flutter 原生移动端（可选）
│   ├── lib/
│   │   ├── main.dart           #   应用入口
│   │   ├── models/             #   数据模型（Movie / Source / Episode）
│   │   ├── providers/          #   Riverpod 状态管理
│   │   ├── screens/            #   页面（首页 / 搜索 / 详情 / 播放 / 个人）
│   │   ├── services/           #   Dio HTTP 封装
│   │   ├── theme/              #   Material 3 深色主题
│   │   └── widgets/            #   通用组件（卡片 / 骨架屏）
│   └── pubspec.yaml
│
├── spider/                     # Python 爬虫
│   ├── run_spider.py           #   CLI 启动脚本
│   ├── scrapy.cfg
│   └── spider/
│       ├── items.py            #   数据项定义
│       ├── pipelines.py        #   MongoDB 管道（upsert 去重）
│       ├── middlewares.py       #   UA / 代理中间件
│       ├── settings.py         #   Scrapy 配置
│       └── spiders/
│           ├── base.py         #   爬虫基类
│           ├── douban.py       #   豆瓣数据爬虫
│           └── generic_cms.py  #   通用苹果 CMS 爬虫
│
├── release/                    # APK 精简发布（独立仓库用）
│   ├── android/                #   精简 Android 工程
│   ├── web-dist/               #   预构建 Web 静态文件
│   └── .github/workflows/      #   精简 CI 工作流
│
├── .github/workflows/          # CI/CD（完整构建流程）
│   └── build-apk.yml
├── docker-compose.yml          # Docker 编排（MongoDB + Redis + Backend）
├── .gitignore
└── .editorconfig
```

## 核心特性

- **CMS 聚合引擎** — 内置 40+ 预配置影视源，统一苹果 CMS 协议，并发搜索 + 自动去重 + Redis 缓存
- **多源切换播放** — 同一影片可一键切换不同 CMS 源，每源独立选集
- **HLS 流媒体** — 基于 HLS.js 的 m3u8 流播放，支持 mp4 回退
- **实时弹幕** — WebSocket 弹幕广播 + 点赞
- **多端覆盖** — Web（PC + 移动端自适应）+ Flutter 原生 + Capacitor APK
- **优雅降级** — MongoDB 不可用时自动降级到内存存储，零依赖可运行
- **动态源管理** — CMS 源可通过 API / 设置页动态启用/禁用，无需改代码

## 技术栈

| 层级 | 技术 |
|------|------|
| Web 前端 | React 18 + Vite + React Router 6 + HLS.js |
| 移动端 | Flutter 3 + Dart + Riverpod + Chewie |
| 后端 | Node.js + Express + Mongoose + ws |
| 数据库 | MongoDB 7 + Redis 7 |
| 爬虫 | Python 3 + Scrapy + pymongo |
| 部署 | Docker Compose / Capacitor APK |
| CI/CD | GitHub Actions |

## 快速开始

### 方式一：Docker 一键部署（推荐）

```bash
# 1. 启动数据库和后端
cd movie-app
docker-compose up -d

# 2. 构建前端
cd web
npm install
npm run build

# 3. 将构建产物复制到后端（后端自动托管静态文件）
cp -r dist ../backend/

# 4. 重启后端使静态文件生效
cd ..
docker-compose restart backend

# 5. 访问 http://localhost:3000
```

### 方式二：本地开发

```bash
# 终端 1：启动数据库
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 终端 2：启动后端
cd backend
npm install
cp .env.example .env
npm run dev          # 监听 3000 端口

# 终端 3：启动前端开发服务器
cd web
npm install
npm run dev          # 监听 5173 端口，API 自动代理到 3000

# 终端 4（可选）：运行爬虫抓取数据
cd spider
pip install -r requirements.txt
python run_spider.py douban --type movie --pages 5
```

### 方式三：打包 Android APK

```bash
cd web
npm install
npm run build:android      # 构建 web + 同步到 Android 工程
cd android
./gradlew assembleDebug    # debug 包（开发调试用）
./gradlew assembleRelease   # release 包（分发用）
# APK 输出: android/app/build/outputs/apk/
```

### 方式四：GitHub Actions 自动构建

推送代码到 `main` 分支后，GitHub Actions 会自动构建 APK 并创建 Release：

1. 进入仓库 **Actions** 页面
2. 选择 **Build Android APK** 工作流
3. 点击 **Run workflow** 可手动触发，或等待 push 自动触发
4. 构建完成后在 **Releases** 页面下载 APK

也可通过 `workflow_dispatch` 选择仅构建 debug 或 release：
- **both**（默认）：同时构建 debug + release
- **debug**：仅构建 debug APK
- **release**：仅构建 release APK

#### Android 独立使用

APK 安装后首次打开需要配置后端服务器地址：

1. 打开 APP → 进入 **设置** 页面
2. 在 **服务器设置** 中输入后端地址（如 `http://192.168.1.100:3000`）
3. 点击 **检测连接** 确认连通
4. 返回首页即可正常使用

## 页面路由

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | Hero 区域 + 热门推荐网格（按类型筛选） |
| 搜索 | `/search?q=关键词` | 聚合搜索 + 热门关键词 + 结果网格 |
| 播放 | `/play/:id` | HLS 播放 + 多源切换 + 选集 + 弹幕 |
| 历史 | `/history` | 观看进度条 + 继续播放 + 删除 |
| 收藏 | `/favorites` | 收藏管理 |
| 缓存 | `/cache` | 已缓存视频管理（下载 / 播放 / 删除） |
| 设置 | `/settings` | CMS 源管理 + 播放设置 |

## API 接口

### 影片与搜索

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/search?q=关键词` | GET | **聚合搜索**（并发多 CMS 源，Redis 1h 缓存） |
| `/api/search/hot?type=&limit=` | GET | 热门推荐（实时拉取 CMS 最新） |
| `/api/movies` | GET | 影片列表（支持 type / category / year / sort / limit） |
| `/api/movies/:id` | GET | 影片详情 |

### 弹幕

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/danmaku/:videoId` | GET | 获取弹幕 |
| `/api/danmaku` | POST | 发送弹幕 |
| `/api/danmaku/:id/like` | POST | 弹幕点赞 |

### 用户数据

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/history` | GET/POST/DELETE | 观看历史（每 5 秒自动上报进度） |
| `/api/favorite` | GET/POST/DELETE | 收藏管理 |
| `/api/cache/download` | POST | 发起缓存下载 |
| `/api/cache/:id` | GET/DELETE | 缓存文件管理 |
| `/api/precache/start` | POST | 预缓存启动 |
| `/api/sync/progress` | POST | 多设备进度同步 |

### 设置与系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/settings` | GET/POST | CMS 源 / 播放设置管理 |
| `/api/users/register` | POST | 用户注册 |
| `/api/users/login` | POST | 用户登录（JWT） |
| `/api/users/profile` | GET/PUT | 用户信息 |
| `/api/health` | GET | 健康检查 |

## 环境变量

后端通过 `.env` 文件配置（参考 `backend/.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `MONGODB_URI` | MongoDB 连接串 | `mongodb://localhost:27017/movie_app` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 密钥 | `default-secret` |
| `JWT_EXPIRE` | JWT 过期时间 | `7d` |

## 爬虫使用

```bash
cd spider
pip install -r requirements.txt

# 爬取豆瓣电影数据
python run_spider.py douban --type movie --pages 5

# 爬取豆瓣电视剧数据
python run_spider.py douban --type tv --pages 3

# 爬取通用 CMS 站点全量数据
python run_spider.py cms --base_url https://example.com --pages 10

# 爬取所有已配置的 CMS 站点
python run_spider.py all
```

## 目录职责说明

| 目录 | 职责 | 可独立运行 |
|------|------|-----------|
| `backend/` | API 服务 + CMS 聚合 + 数据持久化 | 是（内存降级） |
| `web/` | PC / 移动网页前端 + Capacitor APK 打包 | 是（需后端） |
| `client/` | Flutter 原生移动客户端 | 是（需后端） |
| `spider/` | 豆瓣 / CMS 数据爬取 | 是（需 MongoDB） |
| `release/` | 精简 APK 发布（独立仓库场景） | 是 |

## 注意事项

1. 本项目仅供个人学习和研究使用
2. 爬虫请遵守目标网站的 `robots.txt`，合理控制请求频率
3. 生产部署建议配置 Nginx 反向代理 + HTTPS
4. CMS 源配置文件位于 `backend/data/config.json`，可按需启用/禁用
5. `release/` 目录用于独立仓库发布 APK 场景，主仓库开发使用 `web/android/`

## License

MIT
