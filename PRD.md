# 凝序 | Syntropy

> **基于"负熵"哲学的全平台 PWA 办公系统**
> *"在数字杂讯中凝结秩序，于指令流动间止息熵增。"*

---

## 💎 1. 产品哲学 (Product Philosophy)

### 1.1 负熵 (Negentropy)

熵增是宇宙的宿命，代表混乱与无序。在数字化办公中，破碎的语音和杂乱的备忘录就是"熵"。

* **使命**：通过 AI 指令过滤与唯一 ID 锚点，将弥散的信息流凝结为结构化的低熵数据。
* **核心公式**：
* 其中  是 AI 注入的秩序信息，用以抵消输入端的混乱度 。

### 1.2 第一性原理 (First Principles)

回归信息流转的本源：办公的本质不是"填表"，而是"意图的表达"。

* **输入法即媒介**：放弃繁琐的原生录音开发，直接利用键盘语音输入法，回归"纯净文本指令"的本源。
* **ID 即真相**：任务 ID 是跨越 App 与 Excel 边界的唯一"身份证"，是系统抗熵增的最后防线。

### 1.3 工业工程 (Industrial Engineering)

* **防错 (Poka-yoke)**：通过视觉差异对比和 5 秒撤销，建立系统的鲁棒性，防止错误操作污染数据库。
* **标准化 (Standardization)**：1 Tab = 1 Sheet。严格的结构映射消除一切不必要的"动作浪费"。

### 1.4 竞品分析 (Competitive Analysis)

#### 直接竞品对比

| 维度 | 凝序 Syntropy | 滴答清单 | Notion | 飞书多维表格 |
|------|---------------|----------|--------|--------------|
| **核心定位** | 语音指令+Excel协同 | 个人任务管理 | 全能工作空间 | 企业协作平台 |
| **输入方式** | 自然语言AI解析 | 传统表单 | 传统表单 | 传统表单 |
| **Excel兼容** | ⭐ 原生双向同步 | 仅导出 | 需手动导入 | 需手动导入 |
| **离线能力** | PWA离线优先 | 需会员 | 有限 | 有限 |
| **AI能力** | 核心功能 | 付费附加 | 付费附加 | 付费附加 |
| **数据隐私** | 本地存储+BYOK | 云端存储 | 云端存储 | 云端存储 |
| **学习成本** | 低（单输入框） | 中 | 高 | 高 |
| **价格** | 免费(自付API) | 免费/会员 | 免费/付费 | 企业付费 |

#### 差异化优势

* **场景聚焦**：专注"移动端快速录入 ↔ Excel深度编辑"场景，竞品都是全功能平台，反而不够专注
* **Excel原生协同**：ID锚点系统实现真正的双向同步，竞品仅支持导入导出，无法追踪变更
* **语音优先设计**：AI自动解析意图，无需点击操作，竞品的语音仅是文字录入，仍需手动分类
* **隐私优先**：数据存本地，API Key用户自持，竞品要求数据上云，企业敏感数据有顾虑
* **极简交互**：单一输入框，零学习成本，竞品功能多但操作复杂

#### 潜在风险

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 竞品增加AI功能 | 差异化减弱 | 深耕Excel协同这一独特场景 |
| 用户习惯难改变 | 推广困难 | 从特定人群切入(如销售团队) |
| BYOK门槛较高 | 影响小白用户 | 提供详细教程 + 可选托管模式 |

---

## 👤 2. 目标用户 (Target Users)

### 2.1 核心用户画像

#### Persona A：移动办公型管理者

| 维度 | 描述 |
|------|------|
| **典型角色** | 销售经理、项目负责人、创业者 |
| **年龄段** | 28-45岁 |
| **工作场景** | 频繁出差、会议多、碎片化时间办公 |
| **设备习惯** | 手机为主，公司电脑为辅 |
| **核心诉求** | 快速捕捉任务，减少遗忘，降低整理成本 |
| **技术水平** | 熟练使用Office，对新工具接受度中等 |

#### Persona B：执行层助理

| 维度 | 描述 |
|------|------|
| **典型角色** | 项目助理、行政专员、团队协调员 |
| **年龄段** | 22-35岁 |
| **工作场景** | 需要汇总多人任务、维护Excel台账 |
| **设备习惯** | 电脑为主，手机接收信息 |
| **核心诉求** | 减少手动录入、避免版本混乱、快速生成报表 |
| **技术水平** | Excel熟练，愿意尝试提效工具 |

### 2.2 用户痛点分析

| 痛点编号 | 场景描述 | 当前解决方案 | 问题 |
|----------|----------|--------------|------|
| **P1** | 出差途中接到电话，需要记录跟进事项 | 备忘录/微信发给自己 | 信息零散，回公司后需重新整理 |
| **P2** | 领导口头布置多个任务 | 手写笔记或录音 | 转录耗时，容易遗漏细节 |
| **P3** | 多个项目并行，任务散落各处 | 多个Excel表/多个App | 切换成本高，难以统一管理 |
| **P4** | Excel修改后需要同步到手机端 | 手动对比复制 | 易出错，版本混乱 |
| **P5** | 临时需要发送采购清单 | 现场编辑Excel再发邮件 | 流程繁琐，手机操作不便 |

### 2.3 用户故事 (User Stories)

#### 高优先级

* **US-01**：作为一名销售经理，我想通过语音快速录入任务，以便于在开车/走路时捕捉灵感
* **US-02**：作为一名项目助理，我想导入编辑后的Excel并看到变更对比，以便于避免遗漏修改项
* **US-03**：作为一名用户，我想一键将任务清单发送邮件，以便于快速分享给同事

#### 中优先级

* **US-04**：作为一名用户，我想管理多个项目的任务列表，以便于分类处理不同业务线
* **US-05**：作为一名用户，我想在AI操作后有撤销机会，以便于纠正识别错误
* **US-06**：作为一名用户，我想使用自己的API Key，以便于控制成本和保护隐私

#### 低优先级

* **US-07**：作为一名采购专员，我想快速生成临时清单并发送，无需保存到本地
* **US-08**：作为一名用户，我想离线时仍能使用基础功能，以便于在网络不稳定时工作

---

## ⚡ 3. 核心功能规范 (Functional Specifications)

### 3.0 功能优先级矩阵 (MVP Scope)

#### Phase 1 MVP（最小可行产品）

| 优先级 | 功能模块 | 具体能力 | 对应用户故事 |
|--------|----------|----------|--------------|
| **P0** | 任务管理 | 创建/编辑/删除/标记完成 | US-01 |
| **P0** | AI指令解析 | 识别ADD/UPDATE/DELETE意图 | US-01, US-05 |
| **P0** | 5秒撤销 | 所有AI操作可撤销 | US-05 |
| **P0** | Excel导出 | 单Sheet导出为.xlsx文件 | US-03 |
| **P0** | 唯一ID系统 | 自动生成SYN-XXXX格式ID | - |

#### Phase 2 完整版

| 优先级 | 功能模块 | 具体能力 | 对应用户故事 |
|--------|----------|----------|--------------|
| **P1** | 多项目Tab | 创建/切换/重命名项目 | US-04 |
| **P1** | Excel导入 | 解析Excel并匹配ID | US-02 |
| **P1** | Visual Diff | 增/改/删三色对比预览 | US-02 |
| **P1** | 邮件发送 | 通过Resend API发送附件 | US-03 |
| **P1** | BYOK设置 | 用户配置自己的API Key | US-06 |

#### Phase 3 增强版

| 优先级 | 功能模块 | 具体能力 | 对应用户故事 |
|--------|----------|----------|--------------|
| **P2** | Quick Mode | 无状态快速清单生成 | US-07 |
| **P2** | PWA离线 | Service Worker缓存策略 | US-08 |
| **P2** | 深色模式 | 跟随系统或手动切换 | - |
| **P2** | 导出样式优化 | 锁定ID列、自适应列宽 | - |

#### MVP验收标准 (Definition of Done)

* [ ] 用户可通过文本输入创建任务
* [ ] AI正确识别"添加XX任务"类指令，成功率 > 90%
* [ ] 所有操作后出现5秒撤销Toast
* [ ] 可导出包含所有任务的Excel文件
* [ ] 每个任务自动分配唯一ID
* [ ] 数据持久化存储于IndexedDB
* [ ] PWA可安装到手机主屏幕

### 3.1 智能指令中心 (AI-Command Center)

* **交互模式**：单一文本输入框。支持利用输入法转文字，由 AI 自动判定 `ADD`、`UPDATE`、`DELETE` 意图。
* **上下文感知**：AI 需结合当前 Tab 的任务背景执行修改指令（如"把刚才那个上海的改到周五"）。
* **容错机制**：所有 AI 操作触发后提供 **5 秒撤销窗口**，点击可回滚本地状态。

#### AI Prompt 设计示例

```
系统角色：你是一个任务管理助手，负责解析用户的自然语言指令。

输入：用户的文本指令
输出：JSON格式的操作指令

操作类型：
- ADD: 添加新任务
- UPDATE: 修改现有任务
- DELETE: 删除任务

示例输入："下周三之前完成上海客户的合同"
示例输出：
{
  "action": "ADD",
  "task": {
    "content": "完成上海客户的合同",
    "endDate": "2026-01-21"
  },
  "confidence": 0.95
}
```

### 3.2 多项目 Tab 与 Excel 映射 (Multi-Tab Mapping)

* **结构对齐**：App 顶层 Tab 导航与 Excel 底部工作表 (Sheet) 1:1 物理映射。
* **唯一 ID 系统**：任务创建即获永久 ID。Excel 导出时 ID 列默认保护（隐藏或锁定），确保同步链路完整。
* **差异同步引擎 (Visual Diff)**：
  * **翠绿 (Green)**：Excel 中新增的任务。
  * **琥珀 (Yellow)**：字段已变更的任务。
  * **丹红 (Red)**：在 Excel 中已被删除的任务（需用户手动确认）。

### 3.3 闪电快传模式 (Quick Mode)

* **无状态流转**：针对临时采购单或一次性清单，输入后由 Vercel 直接生成 Excel 并发送邮件，本地不产生持久化存储。
* **使用场景**：临时采购清单、会议纪要快速分发、一次性任务列表

---

## 🔄 4. 标准作业流程 (SOP)

1. **摄入 (Ingestion)**：打开 PWA 应用，在指令框利用语音输入法录入意图。
2. **凝结 (Crystallization)**：AI 解析成功，列表生成带 ID 的卡片，经历 5 秒确认期。
3. **分发 (Distribution)**：点击发送邮件，Vercel 在服务端生成多 Sheet Excel 附件并推送至公司邮箱。
4. **处理 (Offline Processing)**：在公司电脑端打开 Excel，进行深度编辑、排序或复杂计算。
5. **回流 (Reflow)**：App 端选择导入更新，系统对比 ID 并展示差异预览图，用户一键确认同步。

---

## 🛠 5. 技术架构 (Technical Architecture)

### 5.1 技术栈选型

* **全栈框架**：Next.js 14 (App Router) + Tailwind CSS + shadcn/ui。
* **状态管理**：Zustand（轻量级、TypeScript友好）。
* **本地数据库**：IndexedDB (经由 Dexie.js)，处理多项目持久化存储。
* **后端引擎**：Vercel Server Actions + Resend API (负责邮件分发)。
* **文档处理**：SheetJS (xlsx) + exceljs (负责精细化 Excel 样式控制)。
* **AI 核心**：OpenAI / DeepSeek (BYOK 模式，Key 存储于用户本地)。
* **测试框架**：Vitest (单元测试) + Playwright (E2E测试)。

### 5.2 数据模型 (Data Schema)

#### 核心实体

```typescript
// 任务实体
interface SyntropyTask {
  id: string;              // 格式: SYN-2026-XXXX (全局唯一)
  projectId: string;       // 所属项目ID
  content: string;         // 任务描述
  startDate?: string;      // ISO日期，可选
  endDate?: string;        // ISO日期，可选
  status: 'todo' | 'done';
  priority?: 'low' | 'medium' | 'high';  // 可选优先级
  rawCommand?: string;     // 原始语音/文本指令
  createdAt: string;       // 创建时间
  updatedAt: string;       // 最后修改时间
}

// 项目实体 (对应Tab)
interface SyntropyProject {
  id: string;              // 格式: PROJ-XXXX
  name: string;            // 项目/Tab名称
  order: number;           // 排序权重
  color?: string;          // 可选：标识色 (#HEX)
  createdAt: string;
  isArchived: boolean;     // 是否归档
}

// 用户设置
interface UserSettings {
  id: 'singleton';         // 单例模式
  aiProvider: 'openai' | 'deepseek';
  apiKey?: string;         // 加密存储
  defaultEmail?: string;   // 默认收件邮箱
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
}

// 同步历史记录
interface SyncRecord {
  id: string;
  timestamp: string;
  type: 'import' | 'export' | 'email';
  projectId: string;
  summary: {
    added: number;
    modified: number;
    deleted: number;
  };
  fileName?: string;       // 相关文件名
}

// 操作日志 (用于撤销)
interface ActionLog {
  id: string;
  timestamp: string;
  actionType: 'ADD' | 'UPDATE' | 'DELETE' | 'BATCH';
  targetIds: string[];     // 受影响的任务ID
  previousState: SyntropyTask[];  // 操作前快照
  canUndo: boolean;        // 是否仍在撤销窗口内
  expiresAt: string;       // 撤销窗口过期时间
}
```

#### IndexedDB 表结构

```typescript
// Dexie.js Schema
const db = new Dexie('SyntropyDB');
db.version(1).stores({
  tasks: 'id, projectId, status, createdAt, updatedAt',
  projects: 'id, order, isArchived',
  settings: 'id',
  syncRecords: 'id, timestamp, projectId',
  actionLogs: 'id, timestamp, canUndo'
});
```

#### ID生成规则

| 实体 | 格式 | 示例 |
|------|------|------|
| 任务 | `SYN-{YEAR}-{4位序号}` | SYN-2026-0001 |
| 项目 | `PROJ-{4位随机}` | PROJ-A7X2 |
| 同步记录 | `SYNC-{时间戳}` | SYNC-1737100800000 |
| 操作日志 | `ACT-{时间戳}` | ACT-1737100800000 |

### 5.3 异常处理策略 (Error Handling)

#### AI解析层

| 异常场景 | 检测方式 | 处理策略 | 用户反馈 |
|----------|----------|----------|----------|
| API请求超时 | 10秒无响应 | 自动重试1次，失败后降级 | "AI响应较慢，已保存原始文本" |
| API Key无效 | 401/403响应 | 引导至设置页 | "API密钥无效，请检查设置" |
| 解析置信度低 | AI返回confidence < 0.7 | 展示解析结果供用户确认 | "AI不太确定，请确认：[解析结果]" |
| 意图无法识别 | AI返回unknown类型 | 作为纯文本任务添加 | "已作为普通任务添加" |
| 余额不足 | 402响应 | 提示充值 | "API额度不足，请充值后重试" |

#### 数据同步层

| 异常场景 | 检测方式 | 处理策略 | 用户反馈 |
|----------|----------|----------|----------|
| Excel格式错误 | 解析时抛出异常 | 拒绝导入 | "文件格式不正确，请使用标准模板" |
| ID列缺失 | 找不到ID字段 | 作为全新数据处理 | "未检测到ID列，将作为新任务导入" |
| ID冲突 | 相同ID不同内容 | 展示双版本对比 | "发现冲突，请选择保留版本" |
| 网络中断 | fetch失败 | 本地队列暂存 | "已离线保存，联网后自动同步" |

#### 本地存储层

| 异常场景 | 检测方式 | 处理策略 | 用户反馈 |
|----------|----------|----------|----------|
| IndexedDB不可用 | 初始化失败 | 使用localStorage降级 | "存储空间受限，部分功能不可用" |
| 存储空间不足 | QuotaExceededError | 提示清理或导出 | "存储空间不足，建议导出备份" |
| 数据损坏 | 读取校验失败 | 尝试从备份恢复 | "数据异常，正在尝试恢复..." |

#### 邮件发送层

| 异常场景 | 检测方式 | 处理策略 | 用户反馈 |
|----------|----------|----------|----------|
| 邮箱格式错误 | 正则校验失败 | 阻止发送 | "请输入正确的邮箱地址" |
| 发送失败 | Resend API错误 | 重试1次 + 下载备选 | "发送失败，已生成下载链接" |
| 附件过大 | 文件 > 10MB | 拒绝发送 | "附件过大，请减少任务数量" |

#### 降级策略 (Graceful Degradation)

```
AI不可用时：
├── 隐藏AI解析提示
├── 显示手动添加入口
└── 保留基础CRUD功能

网络不可用时：
├── 切换到离线模式标识
├── 所有操作写入本地
├── 禁用邮件发送按钮
└── 恢复后触发同步队列
```

---

## 🎨 6. UI/UX 方向 (Visual Management)

### 6.1 禅意设计哲学 (Zen Design)

* **极致留白**：主界面仅保留"指令框 + 任务流"。工具在不需要时应"消失"于视线。
* **单点聚焦**：强调单一输入框的存在感，引导用户通过"言语"而非"点击"来管理事务。

### 6.2 工业工程目视化 (Visual IE)

* **状态反馈**：AI 处理指令时伴随微小的脉冲动画（如同呼吸）。
* **差异色阶**：在同步预览中严格使用 **翠青 (Add)**、**琥珀 (Modify)**、**丹红 (Delete)**，实现秒级风险识别。
* **等宽显示**：ID 列使用等宽字体（Monospace），传达工业级的严谨感。

### 6.3 PWA 交互特性

* **Standalone 模式**：隐藏浏览器地址栏，模拟原生应用全屏体验。
* **触控优化**：关键按钮（语音输入激活区、发送按钮）布局在移动端大拇指舒适操作区。

---

## 📈 7. 成功指标 (Success Metrics)

### 7.1 北极星指标 (North Star Metric)

**周活跃指令数 (Weekly Active Commands)**

> 定义：每周通过AI解析成功执行的指令总数

选择理由：
* 直接反映产品核心价值（语音指令办公）
* 与用户活跃度和留存强相关
* 易于追踪和优化

### 7.2 分层指标体系

#### 用户获取 (Acquisition)

| 指标 | 目标 (Month 1) | 目标 (Month 3) |
|------|----------------|----------------|
| PWA安装数 | 100 | 500 |
| 日新增用户 | 5 | 20 |
| 安装转化率 | 30% | 40% |

#### 用户激活 (Activation)

| 指标 | 目标 | 说明 |
|------|------|------|
| 首次指令成功率 | > 80% | 新用户第一条指令被正确解析 |
| 激活率 | > 50% | 安装后7天内创建≥5个任务 |
| 首次导出率 | > 30% | 安装后7天内导出过Excel |

#### 用户留存 (Retention)

| 指标 | 目标 | 说明 |
|------|------|------|
| 次日留存 | > 40% | D1返回使用 |
| 7日留存 | > 25% | D7返回使用 |
| 30日留存 | > 15% | D30返回使用 |

#### 核心功能健康度

| 指标 | 目标 | 告警阈值 |
|------|------|----------|
| AI解析成功率 | > 90% | < 80% |
| 平均解析延迟 | < 2秒 | > 5秒 |
| Excel导入成功率 | > 95% | < 90% |
| 邮件发送成功率 | > 98% | < 95% |
| 撤销使用率 | < 10% | > 20% (说明AI准确率有问题) |

### 7.3 数据埋点计划

```typescript
// 关键事件埋点
enum TrackEvent {
  // 用户行为
  APP_OPEN = 'app_open',
  COMMAND_INPUT = 'command_input',
  COMMAND_PARSED = 'command_parsed',
  COMMAND_FAILED = 'command_failed',
  UNDO_CLICKED = 'undo_clicked',
  
  // 功能使用
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TAB_SWITCHED = 'tab_switched',
  
  // 导入导出
  EXCEL_EXPORTED = 'excel_exported',
  EXCEL_IMPORTED = 'excel_imported',
  DIFF_CONFIRMED = 'diff_confirmed',
  EMAIL_SENT = 'email_sent',
  
  // 设置
  API_KEY_SAVED = 'api_key_saved',
  THEME_CHANGED = 'theme_changed'
}
```

---

## 📅 8. 开发阶段 (Roadmap)

> 详细开发计划请参阅 [plan.md](./plan.md)

### 总体时间线

```
Week 1-2: Phase 1 基础框架
Week 3-4: Phase 2 AI与同步
Week 5-6: Phase 3 云端与PWA
Week 7:   测试与修复
Week 8:   上线与迭代
```

### Phase 1: 秩序基石 (Foundation)

* [ ] 初始化 Next.js 14 项目并配置 Tailwind + Dexie.js。
* [ ] 建立多 Tab 状态管理系统。
* [ ] 实现 ID 自动生成逻辑与基础任务列表 UI。
* [ ] 开发基础版多 Sheet Excel 导出 Utility。

### Phase 2: 智能凝结 (AI & Sync)

* [ ] 接入 LLM API 实现文本到 JSON 的增、删、改语义解析。
* [ ] 开发全局 5 秒"撤销"状态管理（Action Toast）。
* [ ] 编写核心差异对比算法（ID 碰撞检测逻辑）。
* [ ] 实现 Excel 导入时的 Visual Diff 预览组件。

### Phase 3: 无缝流转 (Cloud Flow)

* [ ] 部署至 Vercel 并配置环境变量。
* [ ] 接入 Resend 后端邮件发送 API（处理 Base64 附件）。
* [ ] 接入 Exceljs 优化导出的 Excel 格式（锁定 ID 列）。
* [ ] 完善 PWA manifest.json 与 Service Worker 离线缓存策略。
