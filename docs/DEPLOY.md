# 浏览器发布说明

## 当前状态

前端已发布至 [GitHub Pages](https://bpbp8.github.io/pds_app/)，仓库已启用 Actions 发布方式。下方步骤供后续维护使用；更新应基于原仓库 master 提交，保留历史。

## GitHub Pages

1. 将改动基于原仓库的 master 提交，保留原有历史与文件。
2. 在仓库设置中打开 Settings → Pages → Build and deployment，将 Source 设为 GitHub Actions。
3. 推送 master，或手动运行 Check and publish web app 工作流。工作流会安装依赖、检查类型与 lint、运行产品规则测试、构建网页，然后发布。
4. 部署成功后核对 https://bpbp8.github.io/pds_app/ 。验证首页、地图、引导、器材与刷新后的深链接，确保 README 顶部的在线体验链接保持有效。

项目设置了 /pds_app 路径前缀，使用单页输出。工作流将首页复制为 404.html，使直接打开作品与引导页面时也能加载应用；GitHub 对不存在的静态路径仍可能返回 HTTP 404。

## 本地查看

```bash
npm ci
npm run build:web
node scripts/static-preview.cjs dist 8766
```

打开 http://127.0.0.1:8766/ 。Windows 也可双击原有的一键启动.bat。

检查部署前缀时，PowerShell 可执行：

```powershell
$env:EXPO_PUBLIC_BASE_PATH='/pds_app'
npm run build:web
node scripts/static-preview.cjs dist 8766 /pds_app
```

此时打开 http://127.0.0.1:8766/pds_app/ 。普通本地预览前应清除该环境变量。

## 现有服务

Firebase 继续承担真实注册、登录、收藏、作品和问答读写。当前测试网络中认证与数据库接口超时，尚未完成线上账号和写入验证。未接入新的国内后端，也未开通付费服务。

前端发布不需要管理员密钥。以后恢复 Firebase 时需核对邮箱登录、数据库规则和网页授权域名，其中包括 bpbp8.github.io；这些后台状态目前未确认。

## 地图

Web 地图使用 Leaflet 与 OpenStreetMap France 的 HOT 公共底图，无需地图 Key。当前个人、公开、低访问量项目应遵守提供方的署名和使用条件；底图没有可用性保证，加载失败时会保留机位列表与导航入口。

- [OSM France 使用条件](https://www.openstreetmap.fr/usage/)
- [Leaflet 文档](https://leafletjs.com/examples/quick-start/)
- [Expo 网页发布](https://docs.expo.dev/guides/publishing-websites/)
- [GitHub Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
