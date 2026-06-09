# 影视聚合 - 发布文件

此目录包含构建 APK 所需的精简文件，避免上传无用文件到 GitHub。

## 目录结构

```
release/
├── android/              # Android 原生项目（精简版）
│   ├── app/
│   │   ├── build.gradle
│   │   ├── capacitor.build.gradle
│   │   ├── proguard-rules.pro
│   │   └── src/
│   │       ├── main/
│   │       │   ├── AndroidManifest.xml
│   │       │   ├── java/com/movie/app/MainActivity.java
│   │       │   └── res/          # 图标、启动页等资源
│   │       └── test/
│   ├── build.gradle
│   ├── capacitor-cordova-android-plugins/
│   ├── capacitor.settings.gradle
│   ├── gradle.properties
│   ├── gradle/
│   │   └── wrapper/
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── settings.gradle
│   └── variables.gradle
├── web-dist/             # 构建后的 Web 静态文件
│   ├── index.html
│   └── assets/
├── .github/
│   └── workflows/
│       └── build-apk.yml # GitHub Actions 工作流
├── capacitor.config.json # Capacitor 配置
└── README.md
```

## 使用方式

### 1. 本地构建

把 `web-dist/` 替换为你构建后的 `dist/` 目录内容，然后：

```bash
cd release/android
gradlew.bat assembleDebug   # Windows
./gradlew assembleDebug     # Linux/Mac
```

### 2. GitHub Actions 自动构建

把整个 `release/` 目录推送到 GitHub，Actions 会自动打包 APK。

```bash
cd release
git init
git add .
git commit -m "release"
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

然后在 GitHub 页面 → Actions → Build APK → Run workflow

## 注意事项

- `web-dist/` 需要先用 `npm run build` 生成
- Android SDK 和 Java 环境需要提前安装（本地构建时）
- GitHub Actions 会自动安装所有环境依赖
