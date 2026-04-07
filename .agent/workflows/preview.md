---
description: 启动 Expo Web 预览并处理端口占用
---

### 🚀 启动预览方案

这是为你定制的“每次都能成功”的预览方案。它会自动清理残留的进程并安全开启服务。

#### 1. 使用脚本启动 (推荐)
首先进入项目目录：
```powershell
cd C:\Users\15001\.gemini\antigravity\scratch\pds_app
```
然后运行：
```powershell
.\scripts\preview.ps1
```

#### 2. 通过 NPM 启动
我也在 `package.json` 中配置了快捷方式：
```bash
npm run preview
```

#### 💡 提示
- 启动后，脚本会自动尝试打开浏览器。
- 如果浏览器没有自动打开，请手动访问：[http://localhost:8081](http://localhost:8081)
- 如果预览界面是白的，可以尝试按 `Shift + R` 刷新。
