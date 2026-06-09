# 影视聚合 APK 构建指南

## 环境要求

- Node.js 18+
- Java JDK 17+
- Android SDK (API 33+)
- Gradle 8.0+

## 构建步骤

### 1. 安装依赖

```bash
cd /workspace/movie-app/web
npm install
```

### 2. 构建Web应用

```bash
npm run build
```

### 3. 同步Capacitor

```bash
npx cap sync android
```

### 4. 构建Debug APK

**Windows:**
```cmd
cd android
gradlew.bat assembleDebug
```

**Linux/Mac:**
```bash
cd android
./gradlew assembleDebug
```

APK输出路径：`android/app/build/outputs/apk/debug/app-debug.apk`

### 5. 构建Release APK（需要签名）

**Windows:**
```cmd
cd android

:: 生成签名密钥
keytool -genkey -v -keystore movie-app.keystore -alias movieapp -keyalg RSA -keysize 2048 -validity 10000

:: 构建Release
gradlew.bat assembleRelease
```

**Linux/Mac:**
```bash
cd android

# 生成签名密钥
keytool -genkey -v -keystore movie-app.keystore -alias movieapp -keyalg RSA -keysize 2048 -validity 10000

# 构建Release
./gradlew assembleRelease
```

APK输出路径：`android/app/build/outputs/apk/release/app-release-unsigned.apk`

## 常见问题

### 1. `'.' 不是内部或外部命令`

**原因**：Windows系统下 `./gradlew` 语法不适用。

**解决**：使用 `gradlew.bat` 代替 `./gradlew`：
```cmd
cd android
gradlew.bat assembleDebug
```

### 2. Gradle下载超时

**解决**：配置国内镜像，编辑 `android/gradle/wrapper/gradle-wrapper.properties`：
```properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-all.zip
```

### 3. Android SDK未找到

**解决**：设置环境变量：
```cmd
set ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin
```

## 项目结构

```
movie-app/
├── backend/          # Node.js后端API
│   ├── src/
│   │   ├── app.js
│   │   ├── routes/   # API路由
│   │   └── services/ # CMS聚合服务
│   └── data/         # 数据存储
└── web/              # React前端 + Capacitor
    ├── src/
    │   ├── App.jsx   # 主应用组件
    │   └── index.css # 样式（含移动端适配）
    ├── android/      # Android原生项目
    └── dist/         # 构建输出
```

## 功能说明

### 已完成功能

| 功能 | 说明 |
|------|------|
| 多源搜索 | 聚合11个CMS源搜索影片 |
| 分类筛选 | 电影/电视剧/综艺/动漫 |
| 播放器 | HLS播放、倍速、弹幕、广告跳过 |
| 历史记录 | 保存播放进度，支持断点续播 |
| 收藏 | 收藏喜欢的影片 |
| 缓存下载 | 下载完整视频（解析m3u8合并ts为mp4） |
| 设置 | CMS源管理、播放设置 |
| 移动端适配 | 响应式布局、底部导航、侧边菜单 |

### APK特性

- 纯WebView封装，无需修改前端代码
- 支持Android 5.0+
- 启动页自定义
- 支持HTTP明文传输（cleartext）
