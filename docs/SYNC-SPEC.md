# 凝序 | Syntropy — 数据与同步契约

> **版本**: 1.0  
> **状态**: 草案  
> **最后更新**: 2026-01-18  
> **关联文档**: [PRD.md](../PRD.md) | [SECURITY-SPEC.md](./SECURITY-SPEC.md)

---

## 1. 概述

本文档定义 Syntropy 的数据同步机制，确保：
- 本地优先（Local-first）架构下的数据完整性
- 多设备同步的一致性
- 冲突解决的确定性
- 数据迁移的安全性

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **本地权威** | IndexedDB 是主数据源，云端仅作备份 |
| **操作日志** | 同步基于操作（Operation），而非状态快照 |
| **幂等性** | 相同操作重放多次，结果一致 |
| **确定性** | 给定相同操作序列，所有设备达到相同状态 |
| **可恢复** | 任何时刻可导出完整数据，迁移失败可回滚 |

---

## 2. 实体标识符策略

### 2.1 ID 格式规范

| 实体类型 | 格式 | 示例 | 生成时机 |
|----------|------|------|----------|
| **用户** | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` | Supabase Auth 创建 |
| **设备** | `DEV-{UUID短码}` | `DEV-a7x2k9m3` | 首次启动应用时 |
| **任务** | `SYN-{YYYY}-{4位序号}` | `SYN-2026-0001` | 任务创建时 |
| **项目** | `PROJ-{4位随机}` | `PROJ-A7X2` | 项目创建时 |
| **操作** | `OP-{设备ID短码}-{时间戳}-{序号}` | `OP-a7x2-1737100800000-001` | 操作发生时 |
| **同步批次** | `BATCH-{时间戳}` | `BATCH-1737100800000` | 同步触发时 |

### 2.2 ID 生成规则

```typescript
// 设备 ID 生成（首次启动，持久化到 localStorage）
function generateDeviceId(): string {
  const existing = localStorage.getItem('syntropy_device_id');
  if (existing) return existing;
  
  const id = `DEV-${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem('syntropy_device_id', id);
  return id;
}

// 任务 ID 生成（年度序号，持久化到 IndexedDB）
async function generateTaskId(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await db.counters.get('task');
  const nextSeq = (counter?.value ?? 0) + 1;
  await db.counters.put({ id: 'task', value: nextSeq, year });
  
  return `SYN-${year}-${String(nextSeq).padStart(4, '0')}`;
}

// 操作 ID 生成（保证唯一性和排序性）
function generateOperationId(deviceId: string): string {
  const shortDeviceId = deviceId.replace('DEV-', '');
  const timestamp = Date.now();
  const seq = getNextOperationSeq(); // 同一毫秒内的序号
  return `OP-${shortDeviceId}-${timestamp}-${String(seq).padStart(3, '0')}`;
}
```

### 2.3 ID 不可变性

- **任务 ID 一旦生成，永不改变**（即使内容完全修改）
- **删除使用软删除**（设置 `deletedAt` 时间戳）
- **ID 冲突**：理论上不可能（时间戳 + 设备 + 序号），若发生则拒绝操作并报错

---

## 3. 操作日志（Operation Log）

### 3.1 操作类型定义

```typescript
type OperationType = 
  | 'TASK_CREATE'
  | 'TASK_UPDATE'
  | 'TASK_DELETE'
  | 'TASK_RESTORE'      // 恢复已删除任务
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DELETE'
  | 'PROJECT_REORDER'   // 调整项目顺序
  | 'SETTINGS_UPDATE';
```

### 3.2 操作记录结构

```typescript
interface Operation {
  // 标识
  id: string;                    // OP-{device}-{timestamp}-{seq}
  type: OperationType;
  
  // 溯源
  deviceId: string;              // 发起操作的设备
  userId?: string;               // 登录用户 ID（未登录为 undefined）
  timestamp: number;             // Unix 毫秒时间戳
  lamportClock: number;          // 逻辑时钟（用于排序）
  
  // 目标
  entityType: 'task' | 'project' | 'settings';
  entityId: string;              // 被操作实体的 ID
  
  // 变更内容
  payload: OperationPayload;     // 具体变更数据
  
  // 元数据
  baseVersion?: number;          // 操作基于的实体版本（用于冲突检测）
  source: 'user' | 'ai' | 'import' | 'sync';  // 操作来源
  undoable: boolean;             // 是否可撤销
  undoGroupId?: string;          // 批量操作的撤销组
  
  // 同步状态
  syncStatus: 'pending' | 'synced' | 'conflict' | 'failed';
  syncedAt?: number;
}

// 变更负载（按操作类型）
type OperationPayload = 
  | TaskCreatePayload
  | TaskUpdatePayload
  | TaskDeletePayload
  | ProjectCreatePayload
  | ProjectUpdatePayload
  | ProjectReorderPayload
  | SettingsUpdatePayload;

interface TaskCreatePayload {
  task: SyntropyTask;            // 完整任务数据
}

interface TaskUpdatePayload {
  fields: Partial<SyntropyTask>; // 仅变更的字段
  previousValues: Partial<SyntropyTask>; // 变更前的值（用于撤销）
}

interface TaskDeletePayload {
  softDelete: boolean;           // true = 软删除，false = 永久删除
  deletedAt: number;
}
```

### 3.3 Lamport 逻辑时钟

用于在分布式环境中确定操作顺序：

```typescript
class LamportClock {
  private counter: number = 0;
  
  // 本地操作时递增
  tick(): number {
    return ++this.counter;
  }
  
  // 收到远程操作时同步
  receive(remoteTime: number): number {
    this.counter = Math.max(this.counter, remoteTime) + 1;
    return this.counter;
  }
  
  // 获取当前值
  get value(): number {
    return this.counter;
  }
}

// 操作排序规则
function compareOperations(a: Operation, b: Operation): number {
  // 1. 先比较 Lamport 时钟
  if (a.lamportClock !== b.lamportClock) {
    return a.lamportClock - b.lamportClock;
  }
  // 2. 时钟相同则比较物理时间戳
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }
  // 3. 都相同则比较设备 ID（确保确定性）
  return a.deviceId.localeCompare(b.deviceId);
}
```

---

## 4. 同步协议

### 4.1 同步流程

```
┌─────────────┐                              ┌─────────────┐
│  本地设备    │                              │  Supabase   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. 获取上次同步版本号                       │
       │─────────────────────────────────────────────>
       │                                            │
       │  2. 返回 lastSyncVersion                   │
       │<─────────────────────────────────────────────
       │                                            │
       │  3. 推送本地新操作 (syncStatus = pending)    │
       │─────────────────────────────────────────────>
       │                                            │
       │  4. 服务端验证 + 存储，返回确认               │
       │<─────────────────────────────────────────────
       │                                            │
       │  5. 拉取远程新操作 (> lastSyncVersion)       │
       │─────────────────────────────────────────────>
       │                                            │
       │  6. 返回远程操作列表                         │
       │<─────────────────────────────────────────────
       │                                            │
       │  7. 本地重放远程操作，处理冲突                │
       │  8. 更新 lastSyncVersion                   │
       └──────────────────────────────────────────────
```

### 4.2 同步触发条件

| 触发场景 | 行为 |
|----------|------|
| **用户登录** | 立即执行全量同步 |
| **数据变更** | 防抖 5 秒后增量同步 |
| **应用恢复前台** | 检查并增量同步 |
| **手动触发** | 立即增量同步 |
| **网络恢复** | 立即处理待同步队列 |

### 4.3 同步状态机

```
                    ┌───────────────┐
                    │     IDLE      │
                    └───────┬───────┘
                            │ trigger sync
                            ▼
                    ┌───────────────┐
              ┌─────│   PUSHING     │─────┐
              │     └───────┬───────┘     │
        error │             │ success     │ conflict
              │             ▼             │
              │     ┌───────────────┐     │
              │     │   PULLING     │     │
              │     └───────┬───────┘     │
              │             │             │
              │      success│             │
              │             ▼             │
              │     ┌───────────────┐     │
              │     │   APPLYING    │─────┤
              │     └───────┬───────┘     │
              │             │             │
              │             ▼             ▼
              │     ┌───────────────┐ ┌───────────────┐
              └────>│    ERROR      │ │  CONFLICT     │
                    └───────────────┘ └───────────────┘
```

---

## 5. 冲突检测与解决

### 5.1 冲突类型

| 冲突类型 | 检测条件 | 解决策略 |
|----------|----------|----------|
| **并发更新** | 同一实体、不同设备、baseVersion 相同 | Last Write Wins (LWW) |
| **更新-删除** | 一方更新、另一方删除同一实体 | 删除优先（可配置） |
| **父级删除** | 项目被删除，但有新任务指向该项目 | 任务移至默认项目 |
| **顺序冲突** | 多设备同时调整项目顺序 | 合并排序（取较小 order 值） |

### 5.2 Last Write Wins (LWW) 实现

```typescript
interface VersionedEntity {
  id: string;
  version: number;           // 每次更新递增
  updatedAt: number;         // 物理时间戳
  updatedBy: string;         // 设备 ID
}

function resolveConflict<T extends VersionedEntity>(
  local: T,
  remote: T,
  conflictPolicy: 'lww' | 'local-wins' | 'remote-wins' | 'manual'
): { winner: T; loser: T; needsManualReview: boolean } {
  
  if (conflictPolicy === 'local-wins') {
    return { winner: local, loser: remote, needsManualReview: false };
  }
  
  if (conflictPolicy === 'remote-wins') {
    return { winner: remote, loser: local, needsManualReview: false };
  }
  
  if (conflictPolicy === 'manual') {
    return { 
      winner: local,  // 暂时保留本地
      loser: remote, 
      needsManualReview: true 
    };
  }
  
  // LWW: 比较更新时间
  if (local.updatedAt > remote.updatedAt) {
    return { winner: local, loser: remote, needsManualReview: false };
  } else if (remote.updatedAt > local.updatedAt) {
    return { winner: remote, loser: local, needsManualReview: false };
  } else {
    // 时间相同，用设备 ID 打破平局（确定性）
    const localWins = local.updatedBy > remote.updatedBy;
    return {
      winner: localWins ? local : remote,
      loser: localWins ? remote : local,
      needsManualReview: false
    };
  }
}
```

### 5.3 冲突记录与用户通知

```typescript
interface ConflictRecord {
  id: string;
  entityType: 'task' | 'project';
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  resolution: 'auto-lww' | 'auto-delete-wins' | 'manual-pending' | 'user-resolved';
  resolvedAt?: number;
  resolvedBy?: 'local' | 'remote' | 'merged';
  createdAt: number;
}

// 用户可见的冲突通知
interface ConflictNotification {
  message: string;           // "任务 'SYN-2026-0001' 在多设备上被修改"
  entityId: string;
  showDiff: boolean;         // 是否显示差异对比
  actions: ('keep-local' | 'keep-remote' | 'view-diff')[];
}
```

---

## 6. 数据模型（同步就绪版）

### 6.1 核心实体扩展

```typescript
// 任务实体（同步就绪）
interface SyntropyTask {
  // 标识
  id: string;                    // SYN-2026-XXXX
  projectId: string;
  
  // 内容
  content: string;
  startDate?: string;            // ISO 日期
  endDate?: string;
  status: 'todo' | 'done';
  priority?: 'low' | 'medium' | 'high';
  rawCommand?: string;
  
  // 同步元数据（Day 1 必须）
  version: number;               // 乐观锁版本号
  createdAt: string;             // ISO 时间戳
  updatedAt: string;
  deletedAt?: string;            // 软删除时间戳
  
  // 所有权（Day 1 必须）
  ownerId?: string;              // 用户 ID（未登录为 undefined）
  createdBy: string;             // 创建设备 ID
  updatedBy: string;             // 最后修改设备 ID
}

// 项目实体（同步就绪）
interface SyntropyProject {
  id: string;
  name: string;
  order: number;
  color?: string;
  isArchived: boolean;
  
  // 同步元数据
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  
  // 所有权
  ownerId?: string;
  createdBy: string;
  updatedBy: string;
}
```

### 6.2 IndexedDB Schema（含同步表）

```typescript
const db = new Dexie('SyntropyDB');

db.version(1).stores({
  // 核心数据
  tasks: 'id, projectId, status, ownerId, updatedAt, deletedAt',
  projects: 'id, order, ownerId, isArchived, deletedAt',
  settings: 'id',
  
  // 同步系统
  operations: 'id, entityId, timestamp, syncStatus, [syncStatus+timestamp]',
  conflicts: 'id, entityId, resolution, createdAt',
  syncMeta: 'id',  // 单例：lastSyncVersion, lastSyncAt, etc.
  
  // 本地状态
  counters: 'id',  // ID 生成计数器
  deviceInfo: 'id' // 设备信息
});
```

---

## 7. 数据迁移策略

### 7.1 Schema 版本管理

```typescript
interface SchemaVersion {
  version: number;
  migratedAt: string;
  migrations: string[];  // 执行的迁移脚本名称
}

// 迁移注册表
const migrations: Migration[] = [
  {
    version: 2,
    name: 'add-sync-fields',
    up: async (db) => {
      // 为现有数据添加同步字段
      const tasks = await db.tasks.toArray();
      const deviceId = getDeviceId();
      
      await db.tasks.bulkPut(tasks.map(task => ({
        ...task,
        version: 1,
        ownerId: undefined,
        createdBy: deviceId,
        updatedBy: deviceId,
        deletedAt: undefined
      })));
    },
    down: async (db) => {
      // 回滚：移除同步字段（如果需要）
    }
  },
  // 更多迁移...
];
```

### 7.2 迁移执行流程

```
应用启动
    │
    ▼
检查 schemaVersion
    │
    ├─── 版本匹配 ───> 正常启动
    │
    ├─── 需要升级 ───> 执行迁移
    │                      │
    │                      ├─── 成功 ───> 更新版本，正常启动
    │                      │
    │                      └─── 失败 ───> 回滚 + 提示用户导出数据
    │
    └─── 版本过高 ───> 阻止使用 + 提示升级应用
         (降级场景)
```

### 7.3 迁移失败恢复

```typescript
async function safeRunMigration(migration: Migration): Promise<boolean> {
  // 1. 创建备份
  const backup = await createFullBackup();
  
  try {
    // 2. 执行迁移
    await migration.up(db);
    
    // 3. 验证数据完整性
    const isValid = await validateDataIntegrity();
    if (!isValid) {
      throw new Error('Migration validation failed');
    }
    
    // 4. 更新版本号
    await db.schemaVersion.put({ version: migration.version });
    
    return true;
    
  } catch (error) {
    // 5. 回滚
    console.error('Migration failed:', error);
    await restoreFromBackup(backup);
    
    // 6. 通知用户
    showMigrationFailureDialog({
      message: '数据升级失败，已恢复到之前状态',
      actions: ['导出数据', '重试', '联系支持']
    });
    
    return false;
  }
}
```

---

## 8. 备份与恢复

### 8.1 本地备份

```typescript
interface LocalBackup {
  version: string;           // 应用版本
  schemaVersion: number;     // 数据库 schema 版本
  createdAt: string;
  deviceId: string;
  data: {
    tasks: SyntropyTask[];
    projects: SyntropyProject[];
    settings: UserSettings;
    operations: Operation[];  // 可选：包含操作日志
  };
  checksum: string;          // SHA-256 校验和
}

// 导出完整备份
async function exportBackup(includeOperations = false): Promise<LocalBackup> {
  const [tasks, projects, settings, operations] = await Promise.all([
    db.tasks.toArray(),
    db.projects.toArray(),
    db.settings.get('singleton'),
    includeOperations ? db.operations.toArray() : []
  ]);
  
  const backup: LocalBackup = {
    version: APP_VERSION,
    schemaVersion: await getSchemaVersion(),
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    data: { tasks, projects, settings, operations },
    checksum: '' // 计算后填充
  };
  
  backup.checksum = await calculateChecksum(backup.data);
  return backup;
}

// 下载为 JSON 文件
function downloadBackup(backup: LocalBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syntropy-backup-${backup.createdAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 8.2 云端恢复

```typescript
// 从云端全量恢复（新设备）
async function fullRestoreFromCloud(userId: string): Promise<RestoreResult> {
  // 1. 验证本地为空或用户确认覆盖
  const localTaskCount = await db.tasks.count();
  if (localTaskCount > 0) {
    const confirmed = await confirmOverwrite();
    if (!confirmed) return { success: false, reason: 'user-cancelled' };
  }
  
  // 2. 拉取云端所有数据
  const { tasks, projects, syncMeta } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);
  
  // 3. 清空本地并写入
  await db.transaction('rw', [db.tasks, db.projects], async () => {
    await db.tasks.clear();
    await db.projects.clear();
    await db.tasks.bulkAdd(tasks);
    await db.projects.bulkAdd(projects);
  });
  
  // 4. 更新同步元数据
  await db.syncMeta.put({
    id: 'singleton',
    lastSyncAt: Date.now(),
    lastSyncVersion: syncMeta.sync_version
  });
  
  return { success: true, tasksRestored: tasks.length };
}
```

---

## 9. 错误处理与监控

### 9.1 同步错误分类

| 错误类型 | 重试策略 | 用户通知 |
|----------|----------|----------|
| **网络错误** | 指数退避重试（max 5次） | 离线指示器 |
| **认证过期** | 刷新 token 后重试 | 提示重新登录 |
| **冲突错误** | 不重试，进入冲突解决流程 | 冲突通知 |
| **服务端错误 5xx** | 指数退避重试 | "同步暂时不可用" |
| **客户端错误 4xx** | 不重试，记录日志 | 根据错误码显示 |
| **数据校验失败** | 不重试，标记异常 | "数据异常，请导出备份" |

### 9.2 监控指标

```typescript
// 同步健康指标
interface SyncMetrics {
  // 计数器
  syncSuccessCount: number;
  syncFailureCount: number;
  conflictCount: number;
  operationsPushed: number;
  operationsPulled: number;
  
  // 延迟
  avgSyncLatencyMs: number;
  lastSyncDurationMs: number;
  
  // 状态
  pendingOperationsCount: number;
  oldestPendingOperationAge: number;  // 毫秒
  
  // 错误
  lastError?: {
    type: string;
    message: string;
    timestamp: number;
  };
}
```

---

## 10. 安全考量

### 10.1 数据传输

- 所有同步通过 HTTPS (TLS 1.3)
- Supabase RLS 确保用户只能访问自己的数据
- 操作日志包含设备 ID，可追溯来源

### 10.2 本地存储

- IndexedDB 数据不加密（浏览器沙箱保护）
- API Key 单独加密存储（见 SECURITY-SPEC.md）
- 敏感操作（如批量删除）需要额外确认

### 10.3 审计日志

- 所有操作记录在 `operations` 表
- 云端保留 90 天操作历史
- 支持按时间范围导出审计日志

---

## 附录 A: 术语表

| 术语 | 定义 |
|------|------|
| **Operation** | 对数据的单次变更操作 |
| **Entity** | 数据实体（Task、Project 等） |
| **LWW** | Last Write Wins，最后写入者获胜 |
| **Lamport Clock** | 逻辑时钟，用于分布式系统中确定事件顺序 |
| **Soft Delete** | 软删除，设置 deletedAt 而非物理删除 |
| **RLS** | Row Level Security，Supabase 的行级安全策略 |

---

## 附录 B: 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-01-18 | 初始版本 |

---

## 附录 C: 规范性定义 (Normative Definitions)

### C.1 确定性冲突规则 (Deterministic Conflict Rule)

**规范**: 当两个操作针对同一实体发生冲突时，使用以下确定性排序规则决定胜者：

```typescript
// 冲突胜者决定算法 (规范性)
function determineWinner(opA: Operation, opB: Operation): Operation {
  // 1. 比较 Lamport 时钟 (主要排序依据)
  if (opA.lamportClock !== opB.lamportClock) {
    return opA.lamportClock > opB.lamportClock ? opA : opB;
  }
  
  // 2. Lamport 相同时，比较物理时间戳 (次要)
  if (opA.timestamp !== opB.timestamp) {
    return opA.timestamp > opB.timestamp ? opA : opB;
  }
  
  // 3. 都相同时，比较设备ID字符串 (确保确定性)
  return opA.deviceId > opB.deviceId ? opA : opB;
}
```

**关键规则**:
- **Lamport 时钟优先**：物理时间戳仅作为备选，不作为主要排序依据
- **设备ID打破平局**：使用字符串比较，确保所有设备得出相同结果
- **冲突范围**：Record-level LWW（整个任务/项目记录），非 Field-level
- **时钟偏移**：客户端时钟不可信，服务端记录 `serverReceivedAt` 用于审计但不参与冲突判定

### C.2 操作应用算法 (Apply Algorithm - Normative)

```typescript
// 规范性操作应用算法
async function applyOperations(ops: Operation[]): Promise<ApplyResult> {
  // 1. 排序：按确定性规则排序
  const sorted = ops.sort((a, b) => {
    if (a.lamportClock !== b.lamportClock) return a.lamportClock - b.lamportClock;
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.deviceId.localeCompare(b.deviceId);
  });
  
  // 2. 去重：跳过已应用的操作 (幂等性)
  const appliedSet = await getAppliedOperationIds();
  const newOps = sorted.filter(op => !appliedSet.has(op.id));
  
  // 3. 依赖检查与应用
  const result: ApplyResult = { applied: [], skipped: [], conflicts: [] };
  
  for (const op of newOps) {
    // 3a. 验证：schema 版本兼容性
    if (!isSchemaCompatible(op)) {
      result.skipped.push({ op, reason: 'schema-incompatible' });
      continue;
    }
    
    // 3b. 依赖检查：CREATE 必须先于 UPDATE/DELETE
    if (op.type !== 'TASK_CREATE' && op.type !== 'PROJECT_CREATE') {
      const entity = await getEntity(op.entityType, op.entityId);
      if (!entity) {
        // 依赖的 CREATE 操作尚未到达，暂存
        await queuePendingOp(op);
        result.skipped.push({ op, reason: 'missing-dependency' });
        continue;
      }
    }
    
    // 3c. 墓碑规则：已删除实体的 UPDATE 被忽略
    const entity = await getEntity(op.entityType, op.entityId);
    if (entity?.deletedAt && op.type.endsWith('_UPDATE')) {
      result.skipped.push({ op, reason: 'entity-deleted' });
      continue;
    }
    
    // 3d. 复活禁止：DELETE 后的 RESTORE 仅限同一用户
    if (op.type === 'TASK_RESTORE') {
      if (entity?.deletedBy !== op.userId) {
        result.skipped.push({ op, reason: 'restore-forbidden' });
        continue;
      }
    }
    
    // 3e. 应用操作
    await applyOperation(op);
    await markOperationApplied(op.id);
    result.applied.push(op);
  }
  
  return result;
}
```

**不变式 (Invariants)**:
1. 给定相同的操作集合，所有设备最终状态一致
2. 操作应用顺序由 Lamport 时钟确定，与接收顺序无关
3. 删除操作胜过并发更新（除非显式 RESTORE）
4. 同一操作不会被应用两次

### C.3 同步游标与幂等性 (Cursoring & Idempotency)

```typescript
// 同步游标结构
interface SyncCursor {
  // 每个设备最后看到的操作
  deviceCursors: Record<string, {
    lastOpId: string;
    lastLamport: number;
  }>;
  
  // 全局同步版本 (服务端分配的递增序号)
  globalSyncVersion: number;
  
  // 最后成功同步时间
  lastSyncAt: number;
}

// 同步协议 - 客户端请求
interface SyncRequest {
  clientId: string;
  deviceId: string;
  cursor: SyncCursor;
  
  // 本地待推送的操作
  outbound: Operation[];
  
  // 请求参数
  maxOpsToFetch: number;  // 最大 500
}

// 同步协议 - 服务端响应
interface SyncResponse {
  // 新操作 (cursor 之后的)
  inbound: Operation[];
  
  // 更新后的游标
  newCursor: SyncCursor;
  
  // 推送确认
  acked: string[];  // 已接受的 outbound op IDs
  rejected: Array<{ opId: string; reason: string }>;
  
  // 是否还有更多
  hasMore: boolean;
}
```

**幂等性规则**:
- 服务端通过 `opId` 去重，相同操作多次推送只存储一次
- 客户端维护 `appliedSet`，避免重复应用
- 重试使用指数退避：1s → 2s → 4s → 8s → 最大 60s
- 离线队列恢复后，按原始顺序重试，不重新生成 opId

### C.4 操作日志维护 (Op-Log Retention & Compaction)

```typescript
// 保留策略
const RetentionPolicy = {
  // 操作日志：云端保留 90 天
  cloudOpLogRetention: 90 * 24 * 60 * 60 * 1000,
  
  // 本地操作日志：保留 30 天或 10000 条，先到为准
  localOpLogRetention: 30 * 24 * 60 * 60 * 1000,
  localOpLogMaxCount: 10000,
  
  // 墓碑保留：30 天后永久删除
  tombstoneRetention: 30 * 24 * 60 * 60 * 1000,
  
  // 快照触发：每 1000 条操作或 7 天
  snapshotInterval: 1000,
  snapshotMaxAge: 7 * 24 * 60 * 60 * 1000
};

// 压缩算法
async function compactOpLog(): Promise<void> {
  // 1. 创建当前状态快照
  const snapshot = await createSnapshot();
  
  // 2. 确定安全删除边界 (所有设备都已同步到此点)
  const minCursor = await getMinDeviceCursor();
  
  // 3. 删除边界之前的操作
  await db.operations
    .where('lamportClock')
    .below(minCursor.lamport)
    .delete();
  
  // 4. 更新快照元数据
  await db.snapshots.put(snapshot);
}

// 新设备初始化
async function initializeNewDevice(userId: string): Promise<void> {
  // 1. 拉取最近快照
  const snapshot = await fetchLatestSnapshot(userId);
  
  // 2. 应用快照
  await applySnapshot(snapshot);
  
  // 3. 拉取快照之后的操作
  const cursor = { globalSyncVersion: snapshot.version };
  await pullAndApplyOps(cursor);
}
```

### C.5 初始同步流程 (Initial Sync)

```
新设备首次登录
       │
       ▼
┌──────────────────┐
│ 检查本地是否有数据 │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
 有数据    无数据
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────────┐
│冲突检测  │  │ 拉取云端快照     │
│提示用户  │  │ + 增量操作       │
│选择保留  │  └────────┬────────┘
└────┬────┘           │
     │                │
     ▼                ▼
┌──────────────────────┐
│    正常同步模式       │
└──────────────────────┘
```
