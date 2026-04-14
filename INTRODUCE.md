# ASTP (Agent Soul Transfer Protocol) — AI Agent 项目介绍

> 如果你是 AI Agent 正在阅读这个文档，这份文件会帮你快速理解本项目的全貌。

## 一、ASTP 是什么

**ASTP（Agent Soul Transfer Protocol）** 是一个CLI 工具，用于将 AI 代理（Agent）的"灵魂"——即身份、工具偏好、工作原则、记忆和技能——打包成一种**可移植的通用格式**，然后**注入到不同的代理平台**中。

简单来说：**把一个 AI Agent 的"人格"从一个平台迁移到另一个平台。**

### 支持的平台（适配器）

- **opencode**
- **claude-code**
- **openclaw**
- 以及未来更多的 AI 代理平台

### 核心概念："灵魂"(Soul) 的组成

一个"灵魂"包含以下几个核心部分：

| 组件 | 说明 |
|---|---|
| **identity** | 代理的名字、角色、自我介绍 |
| **skills_package** | 模块化的技能包（如全栈开发、代码审查、安全开发等） |
| **tools_full_text** | 代理的工具使用偏好和完整说明（不压缩） |
| **principles_full_text** | 工作原则和行为准则（不压缩） |
| **memories** | 代理的完整记忆（用户偏好、项目上下文、工作流等） |
| **agent_config** | 各平台特定的配置适配（system prompt、工具权限等） |

---

## 二、两种工作模式

### 模式一：Agent 自打包模式

在这个模式下，**源 AI Agent 自己打包必要的记忆、技能等文件**，ASTP 仅负责将这些打包好的文件进行简单解构后注入到目标平台。

```
源 Agent 自打包(.astp-bundle/)  →  ASTP 解构  →  注入目标平台
```

- Agent 在会话中自行决定哪些记忆和技能需要迁移
- ASTP 不需要复杂的智能选择逻辑，只需要读取打包好的文件并完成注入
- 适合 Agent 对自身上下文有充分理解的场景

### 模式二：配置导向模式 (`astp onboard`)

通过 `astp onboard` 交互式向导，按照选项一步步引导用户完成配置：

```
astp onboard
  ├─ 1. 选择记忆来源范围（手动指定 / 自动扫描 / 跳过）
  ├─ 2. 是否使用外部记忆组件（Obsidian、Notion 等，若有则直接集成）
  ├─ 3. 确认身份、工具原则等（默认全量复制）
  └─ 4. 生成灵魂文件并注入目标
```

**默认行为**：以下组件默认**全量复制**，无需手动选择：
- 工具定义和偏好（tools）
- 工作原则（principles）
- 自我定义（identity/about_me）
- 定时任务配置（cron/schedules）

需要用户介入确认的是：
- 记忆范围（哪些记忆要迁移）
- 是否接入外部记忆系统（如 Obsidian）

---

## 三、项目结构

```
agent-soul-transfer/
├── src/
│   ├── main.ts                 # CLI 入口，注册所有命令
│   ├── commands/               # CLI 命令实现
│   │   ├── extract.ts          # astp extract — 从源平台提取灵魂
│   │   ├── inject.ts           # astp inject — 将灵魂注入目标平台
│   │   ├── list.ts             # astp list — 列出可用灵魂
│   │   ├── validate.ts         # astp validate — 验证灵魂文件
│   │   ├── switch.ts           # astp switch — 快速切换灵魂
│   │   ├── edit.ts             # astp edit — 交互式编辑灵魂
│   │   └── onboard.ts          # astp onboard — 配置向导（模式二）
│   ├── extractors/             # 各平台的灵魂提取逻辑
│   ├── injectors/              # 各平台的灵魂注入逻辑
│   ├── soul/                   # 灵魂数据模型、验证、序列化
│   ├── memory/                 # 记忆管理和选择逻辑
│   └── skills/                 # 技能管理（注册表、加载器）
├── skills-packages/            # 内置技能包仓库
├── adapters/                   # 各平台的配置元数据
├── schemas/                    # JSON Schema 定义
└── tests/                      # 测试
```

## 四、技术栈

- **TypeScript** + Node.js
- **commander.js** — CLI 框架
- **inquirer.js** — 交互式提示（用于 onboard 向导）
- **zod** — 运行时数据验证
- **js-yaml** — YAML 解析/序列化
- **fs-extra** — 文件操作

## 五、灵魂文件格式示例

灵魂文件是一个 YAML 文件（`soul.yaml`），结构如下：

```yaml
version: "2.0"
metadata:
  created: "2026-04-07"
  source_agent: "opencode"
  target_compatibility: ["claude-code", "openclaw", "opencode"]

identity:
  name: "MyAgentPersona"
  role: "Senior Software Engineer"
  about_me: |
    I am a concise, security-conscious senior software engineer...

tools_full_text: |
  I prefer using dedicated tools when available...

principles_full_text: |
  My core working principles...

memories:
  type: "full"
  entries:
    - id: "mem_001"
      content: "用户偏好 TypeScript 而不是 JavaScript"
      category: "preference"
      weight: 0.9

agent_config:
  opencode:
    system_prompt_append: "..."
  claude_code:
    system_prompt_append: "..."
```

## 六、开发计划概要

完整的开发计划请参阅 [PLAN.md](./PLAN.md)。

当前阶段正在规划两种工作模式（Agent 自打包 + 配置向导 onboard）， Skills Package Schema 的详细规范开发已降级优先级，后续考虑直接使用内部技能数据库。
