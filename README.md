# 拍点啥

围绕“拍点啥、用啥拍、怎么拍”提供完整拍摄决策链路的 Expo / React Native 应用。主要面向想拍出好照片的普通用户，当前以北京旅行、人像、美食和宠物等生活化题材作为演示内容。

## 当前功能

- 按题材浏览北京拍摄灵感与附近作品
- 查看作品的地点、时间、设备、参数和复刻步骤
- 登录后点赞、加入“想拍”清单并跨设备找回
- 邮箱注册、登录、退出和密码重置
- 单图作品发布，自动读取照片中的设备、时间与参数
- 登录后发布器材问题和回答，内容同步到 Firestore
- 手机、相机、运动相机和无人机等设备推荐入口
- 可跨页面前进、后退和退出恢复的新手教程
- Firebase Authentication / Firestore 数据接入与安全规则

## 本地预览

Windows 用户可以直接双击 `一键启动.bat`。脚本会检查依赖、生成干净的静态 Web 包并自动打开首页。

也可以使用命令：

```bash
npm install
npm run preview
```

## 代码检查

```bash
npm run check
```

## Firebase 后端

项目使用 Firebase 邮箱密码认证和 Cloud Firestore。首次部署前，需要在 Firebase 控制台创建默认 Firestore 数据库；本项目面向北京用户，建议选择香港区域 `asia-east2`。随后执行：

```bash
npx --yes firebase-tools@15.27.0 login
npm run firebase:deploy
```

当前原型会先把单图压缩后存入 Firestore 文档，以避开未开通付费 Storage 时的上传阻塞，适合小规模演示。正式运营前应迁移为对象存储 + 缩略图/CDN。

## 手机安装包

项目已配置 EAS Build。首次构建需要一个 Expo 账号，并执行登录：

```bash
npx eas-cli@latest login
```

生成 Android APK（可直接下载到安卓手机安装）：

```bash
npm run build:android:apk
```

构建完成后，EAS 会提供下载地址和二维码。Android 手机打开该地址即可下载 APK；系统可能要求允许“安装未知来源应用”。

生成 iPhone 内测包：

```bash
npm run build:ios:preview
```

iPhone 真机安装需要 Apple Developer Program 账号，并需要先把测试设备加入 Ad Hoc 分发名单。面向更多用户时建议改用 TestFlight。

## 主要技术

- React Native 0.81 + Expo SDK 54
- expo-router
- Firebase Authentication / Cloud Firestore
- expo-location / expo-image-picker

Android 包名与 iOS Bundle ID 均为 `com.bpbp8.pdsapp`。
