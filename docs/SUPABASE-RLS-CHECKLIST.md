# 凝序 | Syntropy — Supabase Schema & RLS Checklist

> **版本**: 1.0  
> **状态**: 草案  
> **最后更新**: 2026-01-26  
> **关联文档**: [SYNC-SPEC.md](./SYNC-SPEC.md) | [SECURITY-SPEC.md](./SECURITY-SPEC.md) | [PRD.md](../PRD.md)

---

## 1. 目的

本清单用于在启用 Phase 5（认证 + 云端备份/恢复）前，校验 Supabase 端的：

- 数据表结构与字段是否与前端一致
- 关键约束（唯一键 / 索引）是否满足 upsert 语义
- Row Level Security (RLS) 策略是否允许客户端按 user_id 读写自己的数据

本项目目前的备份/恢复实现：

- 备份：本地 IndexedDB -> Supabase（push-only，不做 pull/merge）
- 恢复：清空本地后从 Supabase 拉全量（full overwrite）

实现代码参考：

- `src/types/database.ts`
- `src/lib/syncService.ts`

---

## 2. 表结构检查（Schema)

### 2.1 基础要求

- `tasks` / `projects` 表必须存在
- 表必须包含 `user_id` 列（用于 RLS 与数据隔离）
- 必须支持软删除：`deleted_at`（恢复时会过滤 `deleted_at IS NULL`）
- 必须允许按 `(id, user_id)` 做 upsert 冲突键

### 2.2 tasks 表

**最低可用（Legacy Schema）**

`src/lib/syncService.ts` 对 tasks 有降级路径：当扩展字段不存在时，会回退为 legacy payload。
Legacy 模式下可能会丢失 `pic/completed_date/remark` 等字段，且 status 会映射为 `todo/in_progress/done`。

**建议的扩展 Schema（Recommended）**

字段以 `src/types/database.ts` 为准：

| 列名           | 类型             | 必需 | 备注                                                        |
| -------------- | ---------------- | ---- | ----------------------------------------------------------- |
| id             | text             | YES  | 任务 ID（如 `SYN-2026-0001`）                               |
| user_id        | uuid/text        | YES  | Supabase Auth user id                                       |
| project_id     | text             | YES  | 项目 ID                                                     |
| content        | text             | YES  | 任务内容                                                    |
| start_date     | timestamptz/text | NO   | 允许 NULL                                                   |
| end_date       | timestamptz/text | NO   | 允许 NULL                                                   |
| status         | text             | YES  | `pending/in_progress/completed/delayed`（兼容 `todo/done`） |
| pic            | text             | NO   | 负责人                                                      |
| completed_date | timestamptz/text | NO   | 允许 NULL                                                   |
| remark         | text             | NO   | 备注                                                        |
| raw_command    | text             | NO   | 原始指令                                                    |
| created_at     | timestamptz/text | YES  | ISO 字符串写入也可                                          |
| updated_at     | timestamptz/text | YES  | 用于增量备份过滤                                            |
| deleted_at     | timestamptz/text | NO   | 软删除时间                                                  |

**约束/索引（必需）**

1. Upsert 冲突键

前端 upsert 使用 `onConflict: "id,user_id"`，要求数据库存在对应唯一约束：

```sql
-- tasks 唯一键（必须）
create unique index if not exists tasks_id_user_id_key on public.tasks (id, user_id);
```

2. 备份过滤性能

`updated_at` 会用于 `gt("updated_at", lastSyncAt)` 过滤：

```sql
create index if not exists tasks_user_id_updated_at_idx on public.tasks (user_id, updated_at);
create index if not exists tasks_user_id_deleted_at_idx on public.tasks (user_id, deleted_at);
```

### 2.3 projects 表

字段以 `src/types/database.ts` 为准：

| 列名          | 类型             | 必需 | 备注                      |
| ------------- | ---------------- | ---- | ------------------------- |
| id            | text             | YES  | 项目 ID（如 `PROJ-0001`） |
| user_id       | uuid/text        | YES  | Supabase Auth user id     |
| name          | text             | YES  | 项目名                    |
| display_order | int              | YES  | 顺序                      |
| color         | text             | NO   | 允许 NULL                 |
| is_archived   | boolean          | YES  | 是否归档                  |
| created_at    | timestamptz/text | YES  |                           |
| updated_at    | timestamptz/text | YES  | 用于增量备份过滤          |
| deleted_at    | timestamptz/text | NO   | 软删除                    |

**约束/索引（必需）**

```sql
create unique index if not exists projects_id_user_id_key on public.projects (id, user_id);
create index if not exists projects_user_id_updated_at_idx on public.projects (user_id, updated_at);
create index if not exists projects_user_id_deleted_at_idx on public.projects (user_id, deleted_at);
```

### 2.4 sync_metadata 表（可选，但建议准备）

`src/types/database.ts` 定义了 `public.sync_metadata`，用于未来更完整的同步协议。
当前 `src/lib/syncService.ts` 只更新本地 `db.syncMetadata`，尚未读写 Supabase 的 `sync_metadata`。

如果你已经创建了 `sync_metadata`：

- 建议至少包含 `user_id`（主键）、`last_sync_at`、`device_id`、`sync_version`

---

## 3. RLS 检查（Row Level Security）

### 3.1 原则

- 所有业务表启用 RLS
- authenticated 用户只能读写自己的数据（`auth.uid() = user_id`）
- 禁止匿名写入（除非你明确需要）

### 3.2 tasks / projects 的推荐策略

```sql
-- Enable RLS
alter table public.tasks enable row level security;
alter table public.projects enable row level security;

-- SELECT: only own rows
create policy "tasks_select_own" on public.tasks
  for select
  using (auth.uid() = user_id);

create policy "projects_select_own" on public.projects
  for select
  using (auth.uid() = user_id);

-- INSERT: only allow inserting rows for self
create policy "tasks_insert_own" on public.tasks
  for insert
  with check (auth.uid() = user_id);

create policy "projects_insert_own" on public.projects
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: only allow updating self rows, and keep user_id unchanged
create policy "tasks_update_own" on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_update_own" on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: optional (we use soft delete in app)
-- If you allow hard delete via API, keep it scoped:
create policy "tasks_delete_own" on public.tasks
  for delete
  using (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
  for delete
  using (auth.uid() = user_id);
```

---

## 4. 验证步骤

### 4.1 Schema 验证（SQL editor）

检查列是否存在：

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('tasks', 'projects')
order by table_name, ordinal_position;
```

检查唯一索引：

```sql
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('tasks', 'projects');
```

### 4.2 RLS 验证（Policy exists)

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('tasks', 'projects')
order by tablename, policyname;
```

### 4.3 API 级验证（推荐）

因为 `auth.uid()` 依赖请求上下文，最可靠的方式是：

- 使用前端登录真实用户
- 通过应用的“立即备份”/“恢复数据”按钮验证：
  - 备份成功：能写入 tasks/projects（RLS 允许 insert/update）
  - 恢复成功：能读取 tasks/projects（RLS 允许 select）

---

## 5. 常见问题

### 5.1 upsert 报错：`There is no unique or exclusion constraint matching the ON CONFLICT specification`

原因：缺少 `(id, user_id)` 的唯一约束。
解决：按本清单 2.2/2.3 创建 unique index。

### 5.2 恢复数据为空或报错

检查：

- RLS policy 是否允许 select
- `deleted_at` 字段是否存在（恢复会过滤 `deleted_at IS NULL`）
- `user_id` 写入是否正确
