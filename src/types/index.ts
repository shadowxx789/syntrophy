/**
 * Syntropy 核心类型定义
 * 所有数据模型均为同步就绪 (Sync-Ready) 版本
 */

// ============================================================================
// 任务相关类型
// ============================================================================

export type TaskStatus = "pending" | "in_progress" | "completed" | "delayed";

/**
 * 核心任务模型 - 同步就绪版本
 * 包含所有同步元数据字段 (version, ownerId, createdBy, updatedBy, deletedAt)
 */
export interface SyntropyTask {
  /** 唯一标识符，格式: SYN-YYYY-XXXX */
  id: string;

  /** 所属项目ID，格式: PROJ-XXXX */
  projectId: string;

  /** 任务内容 */
  content: string;

  /** 开始日期 (ISO 8601: YYYY-MM-DD) */
  startDate?: string;

  /** 截止日期 (ISO 8601: YYYY-MM-DD) */
  endDate?: string;

  /** 任务状态 */
  status: TaskStatus;

  /** 负责人 (PIC - Person In Charge) */
  pic?: string;

  /** 完成日期 (ISO 8601: YYYY-MM-DD) */
  completedDate?: string;

  /** 备注 */
  remark?: string;

  /** 原始语音/文本指令 */
  rawCommand?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // 同步元数据 (Day 1 必须)
  // ─────────────────────────────────────────────────────────────────────────

  /** 版本号，用于 Lamport 时钟 */
  version: number;

  /** 创建时间 (ISO 8601) */
  createdAt: string;

  /** 最后更新时间 (ISO 8601) */
  updatedAt: string;

  /** 软删除时间 (ISO 8601)，null 表示未删除 */
  deletedAt?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // 所有权信息 (Day 1 必须)
  // ─────────────────────────────────────────────────────────────────────────

  /** 所有者用户ID (Phase 5 用户系统启用后) */
  ownerId?: string;

  /** 创建者设备ID，格式: DEV-xxxxxxxx */
  createdBy: string;

  /** 最后更新者设备ID */
  updatedBy: string;
}

/**
 * 创建任务的输入类型 (省略自动生成的字段)
 */
export type CreateTaskInput = Pick<SyntropyTask, "content" | "projectId"> &
  Partial<
    Pick<SyntropyTask, "startDate" | "endDate" | "pic" | "completedDate" | "remark" | "rawCommand">
  >;

/**
 * 更新任务的输入类型
 */
export type UpdateTaskInput = Partial<
  Pick<
    SyntropyTask,
    "content" | "startDate" | "endDate" | "status" | "pic" | "completedDate" | "remark"
  >
>;

// ============================================================================
// 项目相关类型
// ============================================================================

/**
 * 项目模型 - 对应 Tab
 */
export interface SyntropyProject {
  /** 唯一标识符，格式: PROJ-XXXX */
  id: string;

  /** 项目名称 */
  name: string;

  /** 显示顺序 */
  displayOrder: number;

  /** 主题色 (Tailwind 颜色名或 HEX) */
  color?: string;

  /** 是否归档 */
  isArchived: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // 同步元数据
  // ─────────────────────────────────────────────────────────────────────────

  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  ownerId?: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * 创建项目的输入类型
 */
export type CreateProjectInput = Pick<SyntropyProject, "name"> &
  Partial<Pick<SyntropyProject, "color">>;

// ============================================================================
// 操作日志相关类型 (用于同步)
// ============================================================================

export type OperationType = "CREATE" | "UPDATE" | "DELETE";
export type EntityType = "task" | "project";

/**
 * 操作日志条目 - 用于离线同步和冲突解决
 */
export interface Operation {
  /** 操作唯一ID */
  id: string;

  /** 操作类型 */
  type: OperationType;

  /** 实体类型 */
  entityType: EntityType;

  /** 实体ID */
  entityId: string;

  /** 操作前数据快照 (UPDATE/DELETE 时使用) */
  beforeSnapshot?: string;

  /** 操作后数据快照 */
  afterSnapshot: string;

  /** Lamport 时钟值 */
  lamportClock: number;

  /** 物理时间戳 (ISO 8601) */
  timestamp: string;

  /** 操作来源设备ID */
  deviceId: string;

  /** 是否已同步到云端 */
  synced: boolean;
}

// ============================================================================
// 计数器相关类型 (用于 ID 生成)
// ============================================================================

/**
 * 计数器条目 - 用于生成自增 ID
 */
export interface Counter {
  /** 计数器名称 (如 "task-2026", "project") */
  name: string;

  /** 当前值 */
  value: number;
}

// ============================================================================
// 同步相关类型
// ============================================================================

/**
 * 同步元数据
 */
export interface SyncMetadata {
  /** 设备ID */
  deviceId: string;

  /** 最后同步时间 */
  lastSyncAt?: string;

  /** Lamport 时钟当前值 */
  lamportClock: number;
}

/**
 * 同步状态
 */
export type SyncState = "idle" | "syncing" | "error";

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
}

// ============================================================================
// AI 提示词相关类型
// ============================================================================

/** 提示词预设类型 */
export type PromptPreset = "default" | "concise" | "detailed" | "custom";

/** 单个预设模板的结构 */
export interface PromptTemplate {
  /** 预设名称 */
  name: string;
  /** 预设描述 */
  description: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户提示词模板 */
  userPromptTemplate: string;
  /** 上下文提示词模板 */
  contextPromptTemplate: string;
}

/** 自定义提示词配置 */
export interface CustomPromptConfig {
  /** 是否启用自定义提示词 */
  enabled: boolean;

  /** 当前使用的预设 */
  preset: PromptPreset;

  /** 自定义系统提示词 (preset === "custom" 时生效) */
  systemPrompt?: string;

  /** 自定义用户提示词模板 (preset === "custom" 时生效) */
  userPromptTemplate?: string;

  /** 自定义上下文提示词模板 (preset === "custom" 时生效) */
  contextPromptTemplate?: string;
}

// ============================================================================
// AI 解析相关类型 (Phase 2 预留)
// ============================================================================

export type AIAction = "ADD" | "UPDATE" | "DELETE" | "UNKNOWN";

export interface ParsedCommand {
  action: AIAction;
  task?: Partial<SyntropyTask>;
  targetId?: string;
  confidence: number;
  rawInput: string;
}

// ============================================================================
// Diff 相关类型 (Phase 2 预留)
// ============================================================================

export interface TaskDiff {
  id: string;
  before: SyntropyTask;
  after: SyntropyTask;
  changedFields: (keyof SyntropyTask)[];
}

export interface DiffResult {
  added: SyntropyTask[];
  modified: TaskDiff[];
  deleted: SyntropyTask[];
}

// ============================================================================
// 多 Sheet 导入相关类型
// ============================================================================

/**
 * Sheet 到项目的映射配置
 */
export interface SheetMapping {
  /** Sheet 名称 */
  sheetName: string;

  /** 目标项目 ID，null 表示跳过，"__new__" 表示创建新项目 */
  targetProjectId: string | null;

  /** 创建新项目时的名称 */
  newProjectName?: string;
}

/**
 * 单个项目的差异结果
 */
export interface ProjectDiff {
  /** Sheet 名称 */
  sheetName: string;

  /** 项目 ID */
  projectId: string;

  /** 项目名称 */
  projectName: string;

  /** 是否为新建项目 */
  isNewProject: boolean;

  /** 差异结果 */
  diff: DiffResult;
}

/**
 * 多项目差异结果
 */
export interface MultiProjectDiffResult {
  /** 各项目的差异 */
  projectDiffs: ProjectDiff[];
}

/** 创建新项目的特殊标识 */
export const IMPORT_NEW_PROJECT_ID = "__new__";

// ============================================================================
// 设置相关类型
// ============================================================================

export type AIProvider = "openai" | "deepseek" | "gemini" | "custom";

/**
 * 自定义 AI 提供商配置 (基础配置，用于临时表单)
 */
export interface CustomAIConfig {
  /** 自定义名称 (用于显示) */
  name: string;

  /** API Base URL (如 https://api.example.com/v1) */
  baseUrl: string;

  /** 模型名称 */
  model: string;
}

/**
 * 已保存的自定义提供商配置 (包含完整信息)
 */
export interface SavedCustomProvider {
  /** 唯一标识符，格式: CUSTOM-xxxxxxxx */
  id: string;

  /** 显示名称 */
  name: string;

  /** API Base URL */
  baseUrl: string;

  /** 默认模型 */
  model: string;

  /** 加密后的 API Key */
  encryptedApiKey?: string;

  /** 创建时间 (ISO 8601) */
  createdAt: string;

  /** 最后使用时间 (ISO 8601) */
  lastUsedAt?: string;
}

/**
 * 自定义提供商导出格式 (不含 API Key，安全分享)
 */
export interface CustomProviderExport {
  /** 导出格式版本 */
  version: 1;

  /** 导出时间 (ISO 8601) */
  exportedAt: string;

  /** 提供商列表 */
  providers: {
    name: string;
    baseUrl: string;
    model: string;
  }[];
}

/** 最大自定义提供商数量 */
export const MAX_CUSTOM_PROVIDERS = 10;

/** 已保存的常用收件人 */
export interface SavedRecipient {
  /** 唯一标识 */
  id: string;

  /** 邮箱地址 */
  email: string;

  /** 可选标签 */
  label?: string;

  /** 创建时间 (ISO 8601) */
  createdAt: string;

  /** 最后使用时间 (ISO 8601) */
  lastUsedAt?: string;
}

/** 最大常用收件人数 */
export const MAX_SAVED_RECIPIENTS = 10;

export interface Settings {
  /** AI 服务商 */
  aiProvider: AIProvider;

  /** 加密后的 API Key (用于 OpenAI/DeepSeek/Gemini) */
  encryptedApiKey?: string;

  /** 自定义 AI 配置 (当 aiProvider === "custom" 时使用，向后兼容) */
  customAIConfig?: CustomAIConfig;

  /** Gemini 模型 (当 aiProvider === "gemini" 时使用) */
  geminiModel?: string;

  /** 已保存的自定义提供商列表 */
  savedCustomProviders?: SavedCustomProvider[];

  /** 当前选中的自定义提供商 ID */
  selectedCustomProviderId?: string;

  /** 常用收件人列表 */
  savedRecipients?: SavedRecipient[];

  /** 自定义 AI 提示词配置 */
  customPrompts?: CustomPromptConfig;

  /** 主题模式 */
  theme: "light" | "dark" | "system";

  /** 设备ID */
  deviceId: string;
}
