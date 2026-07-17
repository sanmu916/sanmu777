# 森有三木 · 创作者媒体包

面向品牌方的个人媒体包网站，展示 B 站、抖音和小红书数据、代表作、品牌内容案例与合作报价。

## 功能

- B 站为主阵地，展示数据最好的 3 条视频与 6 条主阵地代表作。
- 抖音、小红书账号数据与主页跳转。
- 品牌内容案例、合作流程、报价与商务联系方式。
- `/admin` 后台可维护个人信息、平台数据、作品、案例与报价。
- 内容保存在 D1 数据库，后台使用 ChatGPT 登录保护。
- 支持桌面端与手机端响应式布局。

## 本地开发

```bash
npm install
npm run dev
```

## 检查

```bash
npm run build
npm run lint
node --test tests/rendered-html.test.mjs
```
