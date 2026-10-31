# 拍点啥

**看照片找机位，跟着三步拍一张，再按场景了解设备。**

面向旅行与日常摄影新手的拍摄决策产品。当前聚焦北京，用同一条体验连接“在哪拍、怎么拍、用什么拍”。支持浏览器体验，保留 Expo / React Native 源码。

[**在线体验 →**](https://bpbp8.github.io/pds_app/)

> 网页已发布，可免登录体验地图、拍摄引导与器材原始样片。注册、发布与收藏保留原 Firebase 服务，当前连接与写入尚未验证。

[产品思路与体验路径](docs/PRODUCT.md) · [本地预览与发布说明](docs/DEPLOY.md)

## 三个问题，三个入口

| 入口 | 能做什么 |
| --- | --- |
| 在哪拍 | 在真实地图上看照片点位、按题材筛选、定位与计算距离、打开导航，并进入对应拍法 |
| 怎么拍 | 按站位、构图与动作、设备设置三步操作；切换四种构图辅助线，用自己的照片对照取景 |
| 用什么拍 | 从场景与升级意向出发，按真实拍摄设备查看样片和原始参数，带着具体设备与场景提问 |

游客可浏览地图、拍法与器材；收藏、点赞、发布和问答写入需要登录。没有本地模拟登录或虚构发布成功。

## 内容来源

收录 12 条编辑拍摄方案。原始拍摄信息与推荐设置分开展示，作品详情保留素材作者、来源和许可。地图区分原始照片坐标与地点参考，器材库场景示意不冒充特定机型实拍。

## 本地运行

```bash
npm ci
npm run build:web
node scripts/static-preview.cjs dist 8766
```

浏览器打开 http://127.0.0.1:8766/ 。Windows 可双击一键启动.bat。日常开发使用 npm run web。

```bash
npm run check
npm run test:product
```

## 项目目录

```text
app/              页面与导航
components/       共用界面、地图与拍摄组件
src/              拍摄规则、示例数据、账号与收藏逻辑
assets/images/    在用图片、品牌图标与素材署名
scripts/          本地预览工具
tests/            产品规则测试
docs/             产品说明、界面截图与发布说明
.github/workflows/ 自动检查和网页发布
vendor/           第三方许可
app.config.ts     统一的应用与平台配置
```

## 技术与边界

- Expo SDK 54、React Native 0.81、TypeScript、expo-router。
- Leaflet + OpenStreetMap France HOT 底图；保留署名与失效提示。
- Firebase Authentication / Firestore；当前保留原服务，未迁移国内后端。
- expo-image-picker、exifr：选择照片并读取可用的原始拍摄信息；对照预览不上传图片。
- 网页为单页输出，GitHub Actions 配置检查、构建与 Pages 发布。

当前不含实时 AI 指导、自动审片或器材实时行情。用户发布图仍沿用压缩后存入 Firestore 的原方案；后续真实运营应另行确认图片存储与服务预算。
