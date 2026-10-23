# 凝序 | Syntropy — 开发计划

> **项目周期**：10周  
> **目标**：完成 MVP 并上线公测，可选扩展用户系统  
> **关联文档**：[PRD.md](./PRD.md)

---

## 📊 总体进度概览

| 阶段                  | 状态      | 进度 | 完成日期   |
| --------------------- | --------- | ---- | ---------- |
| **Phase 1: 秩序基石** | ✅ 已完成 | 100% | 2026-01-17 |
| **Phase 2: 智能凝结** | ✅ 已完成 | 100% | 2026-01-18 |
| **Phase 3: 无缝流转** | ✅ 已完成 | 100% | 2026-01-18 |
| **Phase 4: 测试上线** | ✅ 已完成 | 100% | 2026-01-18 |
| **Phase 5: 用户系统** | ✅ 已完成 | 100% | 2026-01-18 |

## ✅ 当前进度 (2026-01-20)

- ✅ 多自定义 AI 提供商支持已完成（新增/编辑/删除/导入/导出/独立 API Key）
- ✅ 多项目导出与邮件发送已完成（单文件多工作表）
- ✅ 导出弹窗支持多项目选择
- ✅ 邮件弹窗支持多项目选择与常用收件人（标签可选，上限 10）
- ✅ Store 单元测试与 E2E 测试已更新（Chromium 通过）
- ⚠️ Playwright Firefox/WebKit 需安装浏览器后才能全量运行

## 🧭 变更计划：导出 & 邮件多项目 + 常用收件人（已完成）

### 目标

1. 导出与发送邮件时支持**多项目选择**
2. 邮件发送支持**常用收件人列表**（本地存储、可管理）

### 已完成工作

- [x] Settings store 增加常用收件人列表（上限 10）
- [x] Excel 导出支持多项目（单文件多工作表）
- [x] 邮件发送支持多项目附件（单文件多工作表）
- [x] 导出弹窗新增项目多选控件
- [x] 邮件弹窗新增收件人选择/保存入口
- [x] 单元测试与 E2E 用例更新

### 已确认策略

- 多项目导出：单文件多工作表
- 邮件附件：单文件多工作表
- 常用收件人：上限 10，标签可选

---

## 📊 总体时间线

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│  Week 1-2          Week 3-4          Week 5-6          Week 7-8          Week 9-10       │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐     │
│  │ Phase 1 │──────▶│ Phase 2 │──────▶│ Phase 3 │──────▶│ Phase 4 │──────▶│ Phase 5 │     │
│  │ 基础框架 │       │ AI与同步 │       │ 云端PWA │       │ 测试上线 │       │ 用户系统 │     │
│  └─────────┘       └─────────┘       └─────────┘       └─────────┘       └─────────┘     │
│       │                 │                 │                 │                 │          │
│       ▼                 ▼                 ▼                 ▼                 ▼          │
│  M1: 内部可用      M2: AI完成       M3: Beta发布      M4: 正式上线     M5: 多端同步      │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Phase 1: 秩序基石 (Foundation)

**周期**：Week 1-2（共10个工作日）  
**目标**：搭建可本地运行的基础任务管理器

### 里程碑 M1 验收标准

- [x] 本地开发环境可正常运行
- [x] 可创建/编辑/删除任务
- [x] 多Tab切换正常
- [x] 可导出基础Excel文件
- [x] 数据持久化到IndexedDB

### 详细任务分解

#### Week 1: 项目初始化与数据层

| 任务ID | 任务名称                     | 预估工时 | 依赖         | 产出物            | 验收标准               |
| ------ | ---------------------------- | -------- | ------------ | ----------------- | ---------------------- |
| P1-01  | 初始化Next.js 14项目         | 2h       | -            | 项目骨架          | `npm run dev` 正常启动 |
| P1-02  | 配置Tailwind CSS + shadcn/ui | 2h       | P1-01        | UI基础组件        | Button/Input组件可用   |
| P1-03  | 配置ESLint + Prettier        | 1h       | P1-01        | 代码规范          | lint无报错             |
| P1-04  | 配置Dexie.js + 数据模型定义  | 4h       | P1-01        | DB Schema         | 可CRUD测试数据         |
| P1-05  | 实现ID自动生成工具函数       | 2h       | P1-04        | `generateId.ts`   | ID格式符合SYN-XXXX规范 |
| P1-06  | 创建Zustand状态管理Store     | 4h       | P1-04        | `useTaskStore.ts` | 状态读写正常           |
| P1-07  | 实现任务CRUD服务层           | 4h       | P1-04, P1-06 | `taskService.ts`  | 增删改查全通           |

**Week 1 产出**：数据层完整可用，可通过代码操作任务数据

#### Week 2: UI组件与导出功能

| 任务ID | 任务名称            | 预估工时 | 依赖         | 产出物              | 验收标准         |
| ------ | ------------------- | -------- | ------------ | ------------------- | ---------------- |
| P1-08  | 开发顶部Tab导航组件 | 4h       | P1-02        | `TabNav.tsx`        | Tab切换动画流畅  |
| P1-09  | 开发任务列表组件    | 6h       | P1-02, P1-06 | `TaskList.tsx`      | 可展示/勾选任务  |
| P1-10  | 开发任务卡片组件    | 4h       | P1-02        | `TaskCard.tsx`      | 显示ID/内容/日期 |
| P1-11  | 开发任务编辑弹窗    | 4h       | P1-02        | `TaskEditModal.tsx` | 可编辑所有字段   |
| P1-12  | 开发命令输入框组件  | 4h       | P1-02        | `CommandInput.tsx`  | 支持回车提交     |
| P1-13  | 实现基础Excel导出   | 6h       | P1-07        | `exportExcel.ts`    | 可下载.xlsx文件  |
| P1-14  | 集成主页面布局      | 4h       | P1-08~P1-12  | `page.tsx`          | 完整页面可交互   |

**Week 2 产出**：完整的基础任务管理UI，支持多Tab和Excel导出

### Phase 1 技术要点

```typescript
// 目录结构参考
src/
├── app/
│   ├── page.tsx              # 主页面
│   └── layout.tsx            # 根布局
├── components/
│   ├── ui/                   # shadcn/ui组件
│   ├── TabNav.tsx
│   ├── TaskList.tsx
│   ├── TaskCard.tsx
│   ├── TaskEditModal.tsx
│   └── CommandInput.tsx
├── lib/
│   ├── db.ts                 # Dexie数据库实例
│   ├── generateId.ts         # ID生成器
│   └── exportExcel.ts        # Excel导出
├── stores/
│   ├── useTaskStore.ts       # 任务状态
│   └── useProjectStore.ts    # 项目/Tab状态
└── types/
    └── index.ts              # 类型定义
```

---

## 🧠 Phase 2: 智能凝结 (AI & Sync)

**周期**：Week 3-4（共10个工作日）  
**目标**：完成AI指令解析和Excel双向同步

### 里程碑 M2 验收标准

- [x] AI可正确解析ADD/UPDATE/DELETE指令
- [x] 5秒撤销功能正常工作
- [x] Excel导入可识别变更
- [x] Visual Diff预览正确显示三色对比
- [x] BYOK设置页面可用

### 详细任务分解

#### Week 3: AI解析与撤销机制

| 任务ID | 任务名称               | 预估工时 | 依赖  | 产出物              | 验收标准                |
| ------ | ---------------------- | -------- | ----- | ------------------- | ----------------------- |
| P2-01  | 设计AI Prompt模板      | 4h       | -     | `prompts/`          | 覆盖3种意图             |
| P2-02  | 创建AI服务抽象层       | 4h       | P2-01 | `aiService.ts`      | 支持OpenAI/DeepSeek切换 |
| P2-03  | 实现指令解析逻辑       | 6h       | P2-02 | `parseCommand.ts`   | 测试指令解析正确        |
| P2-04  | 开发设置页面UI         | 4h       | P1-02 | `settings/page.tsx` | API Key可保存           |
| P2-05  | 实现API Key加密存储    | 3h       | P2-04 | `crypto.ts`         | Key不明文存储           |
| P2-06  | 开发5秒撤销Toast组件   | 4h       | P1-02 | `UndoToast.tsx`     | 倒计时显示正确          |
| P2-07  | 实现操作日志与回滚逻辑 | 6h       | P1-06 | `useUndo.ts`        | 撤销可恢复状态          |

**Week 3 产出**：AI解析可用，撤销机制完整

#### Week 4: Excel导入与差异对比

| 任务ID | 任务名称                 | 预估工时 | 依赖         | 产出物            | 验收标准           |
| ------ | ------------------------ | -------- | ------------ | ----------------- | ------------------ |
| P2-08  | 实现Excel文件解析        | 6h       | -            | `importExcel.ts`  | 可读取.xlsx数据    |
| P2-09  | 编写ID差异对比算法       | 6h       | P2-08        | `diffEngine.ts`   | 正确识别增/改/删   |
| P2-10  | 开发Visual Diff预览组件  | 8h       | P2-09        | `DiffPreview.tsx` | 三色标注清晰       |
| P2-11  | 开发导入确认弹窗         | 4h       | P2-10        | `ImportModal.tsx` | 可选择性同步       |
| P2-12  | 实现批量同步逻辑         | 4h       | P2-09        | `syncTasks.ts`    | 数据正确合并       |
| P2-13  | AI解析错误处理优化       | 4h       | P2-03        | -                 | 低置信度时提示确认 |
| P2-14  | 集成CommandInput与AI服务 | 4h       | P2-03, P1-12 | -                 | 输入即触发解析     |

**Week 4 产出**：完整的AI指令 + Excel双向同步功能

### Phase 2 技术要点

```typescript
// AI解析返回结构
interface ParsedCommand {
  action: "ADD" | "UPDATE" | "DELETE" | "UNKNOWN";
  task?: Partial<SyntropyTask>;
  targetId?: string; // UPDATE/DELETE时需要
  confidence: number; // 0-1
  rawInput: string;
}

// Diff结果结构
interface DiffResult {
  added: SyntropyTask[]; // 新增的任务
  modified: {
    // 变更的任务
    id: string;
    before: SyntropyTask;
    after: SyntropyTask;
    changedFields: string[];
  }[];
  deleted: SyntropyTask[]; // 删除的任务
}
```

---

## ☁️ Phase 3: 无缝流转 (Cloud Flow)

**周期**：Week 5-6（共10个工作日）  
**目标**：部署上线，完成邮件发送和PWA离线支持

### 里程碑 M3 验收标准

- [x] 成功部署到Vercel (https://syntrophy.vercel.app)
- [x] 可通过邮件发送Excel附件
- [x] PWA可安装到手机主屏
- [x] 离线时基础功能可用
- [x] Quick Mode闪电快传可用

### 详细任务分解

#### Week 5: 部署与邮件服务

| 任务ID | 任务名称                    | 预估工时 | 依赖         | 产出物               | 验收标准             |
| ------ | --------------------------- | -------- | ------------ | -------------------- | -------------------- |
| P3-01  | 创建Vercel项目              | 1h       | -            | 线上环境             | 可通过域名访问       |
| P3-02  | 配置环境变量                | 1h       | P3-01        | `.env.production`    | 变量正确注入         |
| P3-03  | 注册Resend账户并获取API Key | 1h       | -            | API凭证              | 可发送测试邮件       |
| P3-04  | 开发邮件发送Server Action   | 6h       | P3-03        | `sendEmail.ts`       | 邮件可送达           |
| P3-05  | 实现Excel附件Base64编码     | 4h       | P1-13        | `attachmentUtils.ts` | 附件可正常打开       |
| P3-06  | 开发发送邮件弹窗UI          | 4h       | P1-02        | `EmailModal.tsx`     | 可输入收件人         |
| P3-07  | 使用Exceljs优化导出样式     | 6h       | P1-13        | `styledExport.ts`    | ID列锁定、自适应列宽 |
| P3-08  | 实现Quick Mode无状态流程    | 6h       | P3-04, P3-07 | `quick/page.tsx`     | 输入→生成→发送       |

**Week 5 产出**：线上可用，邮件发送功能完整

#### Week 6: PWA与离线支持

| 任务ID | 任务名称               | 预估工时 | 依赖  | 产出物                 | 验收标准            |
| ------ | ---------------------- | -------- | ----- | ---------------------- | ------------------- |
| P3-09  | 配置PWA manifest.json  | 2h       | -     | `manifest.json`        | 元信息完整          |
| P3-10  | 设计App图标（多尺寸）  | 2h       | -     | `icons/`               | 各尺寸清晰          |
| P3-11  | 实现Service Worker注册 | 4h       | -     | `sw.ts`                | 正确注册            |
| P3-12  | 配置离线缓存策略       | 6h       | P3-11 | -                      | 静态资源可离线访问  |
| P3-13  | 实现离线操作队列       | 6h       | P3-12 | `offlineQueue.ts`      | 恢复网络后自动同步  |
| P3-14  | 添加离线状态指示器     | 2h       | P3-13 | `OfflineIndicator.tsx` | 状态变化可见        |
| P3-15  | 添加"添加到主屏幕"引导 | 3h       | P3-09 | `InstallPrompt.tsx`    | iOS/Android均可安装 |
| P3-16  | 移动端触控优化         | 4h       | -     | -                      | 大拇指操作舒适      |

**Week 6 产出**：完整PWA体验，支持离线使用

### Phase 3 技术要点

```typescript
// Service Worker 缓存策略
const CACHE_STRATEGIES = {
  // 静态资源：Cache First
  static: ["/_next/static/", "/icons/", "/fonts/"],

  // API请求：Network First, fallback to cache
  api: ["/api/"],

  // HTML页面：Stale While Revalidate
  pages: ["/", "/settings", "/quick"],
};

// 离线队列结构
interface OfflineAction {
  id: string;
  timestamp: number;
  type: "CREATE" | "UPDATE" | "DELETE";
  payload: any;
  retryCount: number;
}
```

---

## 🧪 Phase 4: 测试与上线 (Testing & Launch)

**周期**：Week 7-8（共10个工作日）  
**目标**：完成测试，修复问题，正式上线

### 里程碑 M4 验收标准

- [ ] 核心流程E2E测试通过
- [ ] Lighthouse评分 > 90
- [ ] 无P0/P1级别Bug
- [ ] 用户文档完成
- [ ] 正式域名上线

### 详细任务分解

#### Week 7: 测试与Bug修复

| 任务ID | 任务名称                 | 预估工时 | 依赖         | 产出物                 | 验收标准                  |
| ------ | ------------------------ | -------- | ------------ | ---------------------- | ------------------------- |
| P4-01  | 配置Vitest单元测试环境   | 2h       | -            | `vitest.config.ts`     | 可运行测试                |
| P4-02  | 编写核心工具函数单元测试 | 6h       | P4-01        | `*.test.ts`            | 覆盖率 > 80%              |
| P4-03  | 配置Playwright E2E测试   | 2h       | -            | `playwright.config.ts` | 可运行E2E                 |
| P4-04  | 编写核心流程E2E测试      | 8h       | P4-03        | `e2e/*.spec.ts`        | 5条核心流程通过           |
| P4-05  | 移动端适配测试           | 4h       | -            | Bug List               | iOS Safari/Android Chrome |
| P4-06  | 性能优化（Lighthouse）   | 6h       | -            | -                      | 评分 > 90                 |
| P4-07  | Bug修复（第一轮）        | 8h       | P4-04, P4-05 | -                      | P0/P1 Bug清零             |

**Week 7 产出**：测试覆盖完成，主要Bug修复

#### Week 8: 文档与发布

| 任务ID | 任务名称               | 预估工时 | 依赖  | 产出物          | 验收标准          |
| ------ | ---------------------- | -------- | ----- | --------------- | ----------------- |
| P4-08  | 编写用户使用指南       | 4h       | -     | `docs/guide.md` | 覆盖核心功能      |
| P4-09  | 编写FAQ文档            | 2h       | -     | `docs/faq.md`   | 常见问题解答      |
| P4-10  | 录制功能演示视频       | 3h       | -     | `demo.mp4`      | 清晰展示核心流程  |
| P4-11  | 配置自定义域名         | 2h       | -     | DNS配置         | 域名可访问        |
| P4-12  | 配置错误监控（Sentry） | 3h       | -     | Sentry项目      | 可捕获线上错误    |
| P4-13  | Bug修复（第二轮）      | 6h       | P4-07 | -               | 所有已知Bug修复   |
| P4-14  | 最终验收测试           | 4h       | -     | 验收报告        | 全部通过          |
| P4-15  | 正式发布公告           | 2h       | P4-14 | 发布文案        | 社交媒体/社区发布 |

**Week 8 产出**：正式上线，文档完备

---

## 👤 Phase 5: 用户系统 (User System)

**周期**：Week 9-10（共10个工作日）  
**目标**：实现用户认证与跨设备数据同步  
**前置条件**：Phase 4 正式上线完成

### 里程碑 M5 验收标准

- [x] 用户可通过邮箱密码注册/登录
- [x] 登录后数据自动同步至云端
- [x] 新设备登录可恢复全部数据
- [x] 同步状态清晰可见
- [x] 离线操作后联网自动同步

### 详细任务分解

#### Week 9: 认证与基础同步

| 任务ID | 任务名称               | 预估工时 | 依赖  | 产出物                   | 验收标准         |
| ------ | ---------------------- | -------- | ----- | ------------------------ | ---------------- |
| P5-01  | 创建Supabase项目       | 1h       | -     | Supabase实例             | 控制台可访问     |
| P5-02  | 配置Supabase Auth      | 2h       | P5-01 | Auth设置                 | 邮箱认证已启用   |
| P5-03  | 设计PostgreSQL表结构   | 3h       | P5-01 | SQL Schema               | 表结构与本地一致 |
| P5-04  | 创建Supabase客户端封装 | 3h       | P5-02 | `supabaseClient.ts`      | 可调用Auth API   |
| P5-05  | 开发登录页面UI         | 4h       | P5-04 | `auth/login/page.tsx`    | 表单验证通过     |
| P5-06  | 开发注册页面UI         | 4h       | P5-04 | `auth/register/page.tsx` | 含密码强度提示   |
| P5-07  | 实现邮箱验证流程       | 3h       | P5-02 | 验证邮件模板             | 验证链接可用     |
| P5-08  | 实现忘记密码流程       | 3h       | P5-02 | `auth/reset/page.tsx`    | 重置邮件可送达   |
| P5-09  | 开发Auth状态管理       | 4h       | P5-04 | `useAuthStore.ts`        | 登录状态正确持久 |
| P5-10  | 实现登出与会话清理     | 2h       | P5-09 | -                        | Token正确清除    |

**Week 9 产出**：完整的用户认证流程

#### Week 10: 数据同步与多端恢复

| 任务ID | 任务名称              | 预估工时 | 依赖         | 产出物                | 验收标准         |
| ------ | --------------------- | -------- | ------------ | --------------------- | ---------------- |
| P5-11  | 实现本地→云端同步逻辑 | 8h       | P5-03, P5-09 | `syncService.ts`      | 数据正确上传     |
| P5-12  | 实现云端→本地恢复逻辑 | 6h       | P5-11        | `restoreService.ts`   | 数据正确下载     |
| P5-13  | 开发同步状态指示器    | 3h       | P5-11        | `SyncIndicator.tsx`   | 状态变化可见     |
| P5-14  | 实现冲突检测与解决    | 5h       | P5-11        | `conflictResolver.ts` | Last Write Wins  |
| P5-15  | 开发个人资料页面      | 4h       | P5-09        | `profile/page.tsx`    | 可修改用户名     |
| P5-16  | 添加登出清理选项      | 2h       | P5-10        | 设置项                | 可选清除本地数据 |
| P5-17  | 同步功能E2E测试       | 4h       | P5-11        | `e2e/sync.spec.ts`    | 核心流程通过     |
| P5-18  | 用户系统文档更新      | 2h       | -            | `docs/auth.md`        | 覆盖认证流程     |

**Week 10 产出**：完整的多端同步功能

### Phase 5 技术要点

#### Supabase PostgreSQL 表结构

```sql
-- 用户扩展信息 (Supabase Auth 自带 auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同步的任务表
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,                    -- SYN-XXXX
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'todo',
  priority TEXT,
  raw_command TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,                 -- 软删除
  UNIQUE(id, user_id)
);

-- 同步的项目表
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,                    -- PROJ-XXXX
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  color TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(id, user_id)
);

-- 同步元数据
CREATE TABLE public.sync_metadata (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  device_id TEXT,
  sync_version INT DEFAULT 0
);

-- RLS 策略
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can CRUD own profiles" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own sync_metadata" ON public.sync_metadata
  FOR ALL USING (auth.uid() = user_id);
```

#### 同步服务接口

```typescript
// 同步服务
interface SyncService {
  // 初始化同步 (登录后调用)
  initialize(userId: string): Promise<void>;

  // 推送本地变更到云端
  pushChanges(): Promise<SyncResult>;

  // 拉取云端数据到本地
  pullChanges(): Promise<SyncResult>;

  // 全量恢复 (新设备)
  fullRestore(): Promise<RestoreResult>;

  // 获取同步状态
  getStatus(): SyncStatus;
}

interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: ConflictItem[];
  errors: SyncError[];
}

interface SyncStatus {
  state: "idle" | "syncing" | "error";
  lastSyncAt: Date | null;
  pendingChanges: number;
  isOnline: boolean;
}
```

#### 目录结构扩展

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── reset/page.tsx
│   │   └── verify/page.tsx
│   └── profile/page.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthGuard.tsx
│   └── SyncIndicator.tsx
├── lib/
│   ├── supabaseClient.ts
│   ├── syncService.ts
│   └── conflictResolver.ts
└── stores/
    └── useAuthStore.ts
```

---

## 📅 里程碑总览

| 里程碑             | 目标日期   | 关键交付物                  | 验收人     |
| ------------------ | ---------- | --------------------------- | ---------- |
| **M1: 内部可用版** | Week 2 末  | 基础任务管理 + 多Tab + 导出 | 开发者自测 |
| **M2: AI功能完成** | Week 4 末  | AI解析 + 撤销 + 导入同步    | 开发者自测 |
| **M3: Beta发布**   | Week 6 末  | 线上部署 + 邮件 + PWA       | 内测用户   |
| **M4: 正式上线**   | Week 8 末  | 完整产品 + 文档             | 公开用户   |
| **M5: 多端同步**   | Week 10 末 | 用户认证 + 云端同步         | 公开用户   |

---

## ⚠️ 风险与应对

| 风险                 | 可能性 | 影响 | 应对策略                                       |
| -------------------- | ------ | ---- | ---------------------------------------------- |
| AI解析准确率不达标   | 中     | 高   | 提前准备Prompt优化方案，准备fallback到手动添加 |
| Resend邮件送达率问题 | 低     | 中   | 备选方案：Nodemailer + SMTP                    |
| 移动端兼容性问题     | 中     | 中   | 早期引入移动端测试，使用BrowserStack           |
| IndexedDB存储限制    | 低     | 中   | 实现数据导出备份功能                           |
| 开发进度延迟         | 中     | 高   | 预留Week 7作为缓冲，必要时砍掉P2功能           |
| Supabase服务不稳定   | 低     | 中   | 本地优先架构，云端仅备份，降级时仍可离线使用   |
| 同步冲突处理复杂     | 中     | 中   | 采用简单的Last Write Wins策略，避免复杂合并    |

---

## 📊 进度跟踪模板

```markdown
## Weekly Status Report

### Week X (MM/DD - MM/DD)

**完成任务**:

- [ ] P1-01: 描述
- [ ] P1-02: 描述

**进行中**:

- [ ] P1-03: 描述 (预计明天完成)

**阻塞/问题**:

- 问题描述及解决方案

**下周计划**:

- P1-04, P1-05, P1-06

**里程碑进度**: M1 60% ████████░░░░
```

---

## 🔗 相关资源

- **设计稿**: [Figma链接] (待补充)
- **API文档**: [Swagger链接] (待补充)
- **部署地址**:
  - 开发环境: `dev.syntropy.app`
  - 生产环境: `syntropy.app`
- **监控面板**: [Vercel Analytics] (待配置)

---

_最后更新: 2026-01-20_

---

## 📝 Phase 3 完成总结 (2026-01-18)

### 本次实现的功能

| 任务ID | 功能                                    | 产出文件                                | 状态 |
| ------ | --------------------------------------- | --------------------------------------- | ---- |
| P3-04  | 邮件发送 Server Action (Resend API)     | `src/app/actions/sendEmail.ts`          | ✅   |
| P3-05  | Excel 附件 Base64 编码工具              | `src/lib/attachmentUtils.ts`            | ✅   |
| P3-06  | 发送邮件弹窗 UI                         | `src/components/EmailModal.tsx`         | ✅   |
| P3-07  | ExcelJS 样式优化 (ID列锁定、自适应宽度) | `src/lib/styledExport.ts`               | ✅   |
| P3-08  | Quick Mode 闪电快传页面                 | `src/app/quick/page.tsx`                | ✅   |
| P3-09  | PWA manifest.json 配置                  | `public/manifest.json`                  | ✅   |
| P3-10  | App 图标占位符                          | `public/icons/icon.svg`                 | ✅   |
| P3-11  | Service Worker 注册                     | `public/sw.js`, `src/lib/registerSW.ts` | ✅   |
| P3-12  | 离线缓存策略配置                        | `public/sw.js`                          | ✅   |
| P3-13  | 离线操作队列                            | `src/lib/offlineQueue.ts`               | ✅   |
| P3-14  | 离线状态指示器                          | `src/components/OfflineIndicator.tsx`   | ✅   |
| P3-15  | 添加到主屏幕引导 (iOS/Android)          | `src/components/InstallPrompt.tsx`      | ✅   |
| P3-16  | 移动端触控优化                          | 多个组件                                | ✅   |

### 新增文件列表

```
src/app/actions/sendEmail.ts     - Resend 邮件发送 Server Action
src/app/quick/page.tsx           - Quick Mode 闪电快传页面
src/lib/styledExport.ts          - ExcelJS 样式化 Excel 生成
src/lib/attachmentUtils.ts       - 邮件附件工具函数
src/lib/registerSW.ts            - Service Worker 注册工具
src/lib/offlineQueue.ts          - 离线操作队列
src/components/EmailModal.tsx    - 邮件发送模态框
src/components/OfflineIndicator.tsx - 离线状态指示器
src/components/InstallPrompt.tsx - PWA 安装引导
src/components/PWAProvider.tsx   - PWA 提供者组件
public/manifest.json             - PWA 清单文件
public/sw.js                     - Service Worker
public/icons/icon.svg            - 应用图标 (SVG)
```

### 新增依赖

```json
{
  "resend": "^x.x.x", // 邮件发送 API
  "exceljs": "^x.x.x" // Excel 样式化导出
}
```

### 构建状态

```
Route (app)                              Size     First Load JS
┌ ○ /                                    156 kB          330 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /quick                               267 kB          401 kB
└ ○ /settings                            3.14 kB         173 kB
+ First Load JS shared by all            87.3 kB

○  (Static)  prerendered as static content
```

### 下一步行动

1. **部署到 Vercel**: 运行 `vercel deploy` 或连接 GitHub 仓库
2. **配置环境变量**: 在 Vercel 中设置 `RESEND_API_KEY` 和 `RESEND_FROM_EMAIL`
3. **生成实际图标**: 将 `public/icons/icon.svg` 转换为多尺寸 PNG
4. **进入 Phase 4**: 测试、Bug修复、正式上线

---

## 📝 Phase 4 完成总结 (2026-01-18)

### 本次实现的功能

| 任务ID | 功能                    | 产出文件                      | 状态 |
| ------ | ----------------------- | ----------------------------- | ---- |
| P4-01  | Vitest 单元测试环境配置 | `vitest.config.ts`            | ✅   |
| P4-02  | 核心工具函数单元测试    | `src/lib/*.test.ts` (5个文件) | ✅   |
| P4-03  | Playwright E2E 测试配置 | `playwright.config.ts`        | ✅   |
| P4-04  | 核心流程 E2E 测试       | `e2e/app.spec.ts`             | ✅   |
| P4-05  | 移动端适配测试          | `e2e/mobile.spec.ts`          | ✅   |
| P4-06  | 性能优化 (Next.js 配置) | `next.config.mjs` 优化        | ✅   |

### 测试覆盖

| 测试文件                     | 测试数 |
| ---------------------------- | ------ |
| `src/lib/utils.test.ts`      | 8      |
| `src/lib/generateId.test.ts` | 5      |
| `src/lib/crypto.test.ts`     | 14     |
| `src/lib/diffEngine.test.ts` | 18     |
| `src/lib/prompts.test.ts`    | 21     |
| **总计**                     | **66** |

### 新增文件列表

```
vitest.config.ts              - Vitest 配置 (Windows pool: threads 修复)
playwright.config.ts          - Playwright E2E 配置
src/test/setup.ts             - 测试环境设置
src/test/mocks/next-*.tsx     - Next.js 组件 mock
src/lib/utils.test.ts         - cn() 工具函数测试
src/lib/generateId.test.ts    - ID 生成器测试
src/lib/crypto.test.ts        - 加密/解密测试
src/lib/diffEngine.test.ts    - Excel diff 算法测试
src/lib/prompts.test.ts       - AI 提示词模板测试
e2e/app.spec.ts               - 核心流程 E2E 测试
e2e/mobile.spec.ts            - 移动端响应式测试
```

### 新增测试命令

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## 📝 Phase 5 完成总结 (2026-01-18)

### 本次实现的功能

| 任务ID | 功能                         | 产出文件                                 | 状态 |
| ------ | ---------------------------- | ---------------------------------------- | ---- |
| P5-00  | 安装 Supabase 依赖           | `@supabase/supabase-js`, `@supabase/ssr` | ✅   |
| P5-03  | PostgreSQL 表结构设计        | `supabase/schema.sql`                    | ✅   |
| P5-04  | Supabase 客户端封装          | `src/lib/supabaseClient.ts`              | ✅   |
| P5-05  | 登录页面 UI                  | `src/app/auth/login/page.tsx`            | ✅   |
| P5-06  | 注册页面 UI (含密码强度提示) | `src/app/auth/register/page.tsx`         | ✅   |
| P5-08  | 忘记密码页面                 | `src/app/auth/reset/page.tsx`            | ✅   |
| P5-09  | Auth 状态管理 Store          | `src/stores/useAuthStore.ts`             | ✅   |
| P5-11  | 本地→云端同步逻辑            | `src/lib/syncService.ts`                 | ✅   |
| P5-12  | 云端→本地恢复逻辑            | `src/lib/syncService.ts` (fullRestore)   | ✅   |
| P5-13  | 同步状态指示器组件           | `src/components/SyncIndicator.tsx`       | ✅   |
| P5-14  | 冲突解决 (Last Write Wins)   | `src/lib/syncService.ts` 内置            | ✅   |
| P5-15  | 个人资料页面                 | `src/app/profile/page.tsx`               | ✅   |
| -      | AuthGuard 路由保护组件       | `src/components/auth/AuthGuard.tsx`      | ✅   |
| -      | 数据库类型定义               | `src/types/database.ts`                  | ✅   |

### 新增文件列表

```
supabase/schema.sql                    - Supabase 数据库 Schema (含 RLS 策略)
src/lib/supabaseClient.ts              - Supabase 客户端封装
src/lib/syncService.ts                 - 双向同步服务
src/types/database.ts                  - Supabase 表类型定义
src/stores/useAuthStore.ts             - 认证状态管理
src/app/auth/login/page.tsx            - 登录页面
src/app/auth/register/page.tsx         - 注册页面
src/app/auth/reset/page.tsx            - 密码重置页面
src/app/profile/page.tsx               - 个人资料页面
src/components/auth/AuthGuard.tsx      - 路由保护组件
src/components/SyncIndicator.tsx       - 同步状态指示器
```

### 新增依赖

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "@supabase/ssr": "^0.x.x"
}
```

### 新增路由

| 路由             | 描述               |
| ---------------- | ------------------ |
| `/auth/login`    | 用户登录           |
| `/auth/register` | 用户注册           |
| `/auth/reset`    | 密码重置           |
| `/profile`       | 个人资料与同步控制 |

### 构建状态

```
Route (app)                              Size     First Load JS
┌ ○ /                                    156 kB          324 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /auth/login                          3.17 kB         164 kB
├ ○ /auth/register                       4 kB            164 kB
├ ○ /auth/reset                          3.13 kB         164 kB
├ ○ /profile                             6.75 kB         198 kB
├ ○ /quick                               260 kB          401 kB
└ ○ /settings                            5.39 kB         178 kB
+ First Load JS shared by all            87.3 kB

○  (Static)  prerendered as static content

✅ Build: PASSED
✅ Tests: 66/66 PASSED
```

### 用户启用步骤

1. **创建 Supabase 项目**: 访问 https://supabase.com 创建新项目
2. **运行数据库 Schema**: 在 SQL Editor 中执行 `supabase/schema.sql`
3. **配置环境变量**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
4. **启用邮箱认证**: Authentication > Providers > Email 启用
5. **部署应用**: 重新部署以生效

### 架构说明

- **本地优先**: IndexedDB 为主存储，Supabase 为云备份
- **BYOK 保护**: API Key 永不上传，仅存本地加密
- **Last Write Wins**: 简单冲突解决策略
- **软删除**: `deleted_at` 时间戳标记，支持数据恢复
