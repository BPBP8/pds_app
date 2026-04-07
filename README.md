# 怎么拍 - 摄影爱好者社区 APP

**拍什么？怎么拍？用什么拍？**

一款帮助摄影爱好者解决拍摄灵感、拍摄方法、器材选择问题的社区应用。

## 功能特点

### 灵感池
- 浏览精选摄影作品
- 按动机/情绪/方法筛选
- 拍照教程入口

### 拍照教程
- 图文教程内容
- 分类：构图技巧、参数指南、光影运用、后期思路
- 难度分级：入门/进阶/高级

### 器材库
- 相机/手机器材展示
- 参数规格、用户评价、精选样张
- 品牌和价格筛选

### 选购问答
- 器材选购提问
- 社区用户解答
- 最佳答案采纳

### 附近机位
- 地图展示拍照机位
- AI 智能推荐（根据时间/题材/难度）

## 技术栈

- **框架**: React Native + Expo
- **路由**: expo-router (文件路由)
- **后端**: Firebase (Auth + Firestore + Storage)
- **地图**: react-native-maps + expo-location

## 开始开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start
```

## 项目结构

```
app/                    # 页面文件 (expo-router)
├── (tabs)/            # 底部 Tab 页面
│   ├── inspire.tsx   # 灵感池
│   ├── guides.tsx    # 器材库 + 选购问答
│   ├── locations.tsx # 机位地图 + AI推荐
│   └── profile.tsx   # 个人中心
├── tutorial/         # 教程详情
├── question/         # 问答详情
├── modal.tsx         # 发布作品
└── ask-question.tsx  # 发布问答

components/           # React 组件
src/config/          # Firebase 配置
```

## 后续更新

后续更改可以直接让我帮忙推送到 GitHub 覆盖旧版本，或者你自己在本地修改后推送。
