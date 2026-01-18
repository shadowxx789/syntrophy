# 凝序 | Syntropy

<div align="center">

![Syntropy Logo](https://img.shields.io/badge/Syntropy-负熵办公-1a1a2e?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEyIDIgMTkgMjEgMTIgMTcgNSAyMSAxMiAyIj48L3BvbHlnb24+PC9zdmc+)

**基于"负熵"哲学的全平台 PWA 办公系统**

*"在数字杂讯中凝结秩序，于指令流动间止息熵增。"*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[演示 Demo](https://syntropy.app) · [文档 Docs](./PRD.md) · [开发计划 Roadmap](./plan.md)

</div>

---

## 💡 为什么是 Syntropy?

| 传统办公工具的痛点 | Syntropy 的解决方案 |
|-------------------|---------------------|
| 📱 手机记录 → 💻 电脑整理，信息断层 | 语音指令直接生成结构化任务，AI 自动解析意图 |
| 📝 多个 App 切换，任务散落各处 | 单一入口，多项目 Tab 统一管理 |
| 📊 Excel 修改后手动同步，版本混乱 | ID 锚点系统 + Visual Diff，一键同步变更 |
| 🔒 数据上云，隐私担忧 | 本地优先存储，BYOK 模式自持 API Key |

---

## ✨ 核心特性

### 🎯 AI 智能指令中心

```
输入: "下周三之前完成上海客户的合同"

AI 自动解析 ↓

{
  "action": "ADD",
  "task": {
    "content": "完成上海客户的合同",
    "endDate": "2026-01-21"
  }
}
```

- **自然语言理解**: 支持 ADD / UPDATE / DELETE 三种意图自动识别
- **上下文感知**: "把刚才那个改到周五" 也能正确处理
- **5 秒撤销**: 所有 AI 操作均可在 5 秒内一键回滚

### 📊 Excel 双向同步

```
App 任务列表  ←──── ID 锚点 ────→  Excel 工作表
     │                                    │
     └──────── Visual Diff ───────────────┘
               🟢 新增  🟡 修改  🔴 删除
```

- **1 Tab = 1 Sheet**: 严格的结构映射，消除理解成本
- **唯一 ID 系统**: 每个任务自动生成 `SYN-2026-XXXX` 格式 ID
- **三色差异对比**: 导入时清晰展示变更，秒级风险识别

### ⚡ 闪电快传模式

临时采购单、一次性清单？无需保存，直接生成 Excel 发送邮件。

### 📱 PWA 全平台支持

- 📲 安装到手机主屏，原生 App 体验
- 🔌 离线可用，网络恢复自动同步
- 👆 触控优化，大拇指舒适操作区

### 👤 用户系统（Phase 5）

- 🔐 邮箱密码注册登录，Supabase Auth 驱动
- ☁️ 本地优先，云端备份，数据永不丢失
- 🔄 多设备无缝同步，新设备一键恢复
- 🛡️ 隐私优先，API Key 永不上云

---

## 🛠 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **框架** | Next.js 14 (App Router) | React 全栈框架 |
| **样式** | Tailwind CSS + shadcn/ui | 原子化 CSS + 高质量组件 |
| **状态** | Zustand | 轻量级状态管理 |
| **存储** | IndexedDB (Dexie.js) | 浏览器本地数据库 |
| **AI** | OpenAI / DeepSeek | BYOK 模式，用户自持 Key |
| **邮件** | Resend API | 服务端邮件发送 |
| **Excel** | SheetJS + ExcelJS | 读写 + 样式控制 |
| **部署** | Vercel | 边缘函数 + CDN |
| **测试** | Vitest + Playwright | 单元测试 + E2E |
| **认证** | Supabase Auth | 邮箱密码认证 |
| **云存储** | Supabase PostgreSQL | 用户数据云端备份 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.17
- pnpm >= 8.0 (推荐) 或 npm >= 9.0

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/shadowxx789/syntrophy.git
cd syntropy

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 API Keys

# 4. 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

### 环境变量

```env
# .env.local

# AI 服务 (可选，用户也可在设置页面配置)
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# 邮件服务
RESEND_API_KEY=re_xxx

# Supabase (Phase 5 用户系统)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 主页面
│   ├── settings/          # 设置页
│   ├── quick/             # 闪电快传模式
│   └── layout.tsx         # 根布局
├── components/
│   ├── ui/                # shadcn/ui 组件
│   ├── TabNav.tsx         # Tab 导航
│   ├── TaskList.tsx       # 任务列表
│   ├── TaskCard.tsx       # 任务卡片
│   ├── CommandInput.tsx   # 指令输入框
│   ├── DiffPreview.tsx    # 差异对比预览
│   └── UndoToast.tsx      # 撤销提示
├── lib/
│   ├── db.ts              # Dexie 数据库实例
│   ├── aiService.ts       # AI 服务封装
│   ├── diffEngine.ts      # 差异对比算法
│   ├── exportExcel.ts     # Excel 导出
│   └── importExcel.ts     # Excel 导入
├── stores/
│   ├── useTaskStore.ts    # 任务状态
│   ├── useProjectStore.ts # 项目状态
│   └── useSettingsStore.ts# 设置状态
└── types/
    └── index.ts           # 类型定义
```

---

## 📖 使用指南

### 基础操作

| 操作 | 方法 |
|------|------|
| **添加任务** | 在指令框输入自然语言，如 "明天下午开会" |
| **修改任务** | 输入 "把上海那个改到周五" 或点击任务卡片编辑 |
| **删除任务** | 输入 "删除第一个任务" 或滑动删除 |
| **切换项目** | 点击顶部 Tab 切换不同项目 |
| **导出 Excel** | 点击导出按钮，下载当前项目任务表 |
| **导入 Excel** | 点击导入按钮，选择文件后预览差异 |
| **发送邮件** | 点击发送按钮，输入收件人即可 |

### AI 指令示例

```
✅ "添加一个任务：周五前完成报告"
✅ "下周三之前联系张总"
✅ "把刚才那个改成下周一"
✅ "删除上海客户那个任务"
✅ "标记第一个任务为完成"
```

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 提交指令 |
| `Ctrl/Cmd + Z` | 撤销 (5秒内) |
| `Ctrl/Cmd + E` | 导出 Excel |
| `Ctrl/Cmd + I` | 导入 Excel |
| `Ctrl/Cmd + ,` | 打开设置 |

---

## 🗺 开发路线图

```
Week 1-2          Week 3-4          Week 5-6          Week 7-8          Week 9-10
┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐
│ Phase 1 │──────▶│ Phase 2 │──────▶│ Phase 3 │──────▶│ Phase 4 │──────▶│ Phase 5 │
│ 基础框架 │       │ AI与同步 │       │ 云端PWA │       │ 测试上线 │       │ 用户系统 │
└─────────┘       └─────────┘       └─────────┘       └─────────┘       └─────────┘
     │                 │                 │                 │                 │
     ▼                 ▼                 ▼                 ▼                 ▼
M1: 内部可用      M2: AI完成       M3: Beta发布      M4: 正式上线     M5: 多端同步
```

| 阶段 | 状态 | 核心功能 |
|------|------|----------|
| **Phase 1** | 🔄 进行中 | 任务 CRUD、多 Tab、Excel 导出 |
| **Phase 2** | ⏳ 待开始 | AI 解析、5秒撤销、Visual Diff |
| **Phase 3** | ⏳ 待开始 | 邮件发送、PWA 离线、Quick Mode |
| **Phase 4** | ⏳ 待开始 | 测试优化、文档、正式上线 |
| **Phase 5** | ⏳ 待开始 | 用户认证、云端同步、多端恢复 |

> 📋 详细开发计划请查看 [plan.md](./plan.md)

---

## 🧪 测试

```bash
# 运行单元测试
pnpm test

# 运行 E2E 测试
pnpm test:e2e

# 测试覆盖率报告
pnpm test:coverage
```

---

## 🚢 部署

### Vercel 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shadowxx789/syntrophy)

### 手动部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 配置
- 组件使用函数式写法 + Hooks
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 相关文档

| 文档 | 说明 |
|------|------|
| [PRD.md](./PRD.md) | 产品需求文档 - 完整的产品设计规范 |
| [plan.md](./plan.md) | 开发计划 - 详细的任务分解与时间表 |
| [CHANGELOG.md](./CHANGELOG.md) | 更新日志 (待创建) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 (待创建) |

---

## 📜 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [shadcn/ui](https://ui.shadcn.com/) - 高质量 UI 组件
- [Dexie.js](https://dexie.org/) - IndexedDB 封装
- [SheetJS](https://sheetjs.com/) - Excel 处理库
- [Resend](https://resend.com/) - 邮件发送服务
- [Supabase](https://supabase.com/) - 开源 Firebase 替代方案

---

<div align="center">

**凝序 | Syntropy**

*将混乱凝结为秩序*

Made with ❤️ by [shadowxx789](https://github.com/shadowxx789)

</div>
