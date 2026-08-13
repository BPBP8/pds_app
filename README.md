# 拍点啥

围绕“拍点啥、用啥拍、怎么拍”提供完整拍摄决策链路的 Expo / React Native 应用。主要面向想拍出好照片的普通用户，当前以北京旅行、人像、美食和宠物等生活化题材作为演示内容。

## 当前功能

- 按题材浏览北京拍摄灵感与附近作品
- 查看作品的地点、时间、设备、参数和复刻步骤
- 点赞、加入“想拍”清单并在个人页找回
- 单图作品发布与公开拍摄问答
- 手机、相机、运动相机和无人机等设备推荐入口
- 可跨页面前进、后退和退出恢复的新手教程
- 邮箱账号登录相关页面与 Firebase 数据接入

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
- Firebase Auth / Firestore / Storage
- expo-location / expo-image-picker

Android 包名与 iOS Bundle ID 均为 `com.bpbp8.pdsapp`。
