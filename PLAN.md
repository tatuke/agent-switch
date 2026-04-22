# Agent Soul Transfer Protocol (ASTP) - 项目计划

## 概念

一个可移植的"灵魂"打包系统，将 AI 代理的身份、能力、工具偏好、工作原则和记忆提取到通用格式，然后注入到不同的代理平台中。

---

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                  ASTP Core                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Extractor│  │ Transformer│ │   Injector    │ │
│  │ (Export) │──│ (Normalize)│──│ (Import)     │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │          Soul Schema (Updated)          │   │
│  │  identity / skills_package /            │   │
│  │  tools_full_text / principles_full_text │   │
│  │  memories (full, no compression)        │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Adapter: │ │Adapter: │ │Adapter: │  ...      │
│  │opencode │ │claude   │ │openclaw │           │
│  │         │ │code     │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
```

---

## 两种工作模式

### 模式一：Agent 自打包模式

AI Agent 自行打包必要的记忆、技能等文件，ASTP 直接利用打包好的文件进行简单解构后注入到目标平台。

**流程**：
```
源 Agent 会话中自打包  →  生成 .astp-bundle/  →  ASTP 读取并解构  →  注入目标平台
```

- Agent 自行判断哪些记忆和技能需要迁移，打包到标准目录结构
- ASTP 无需复杂的智能选择逻辑，只需读取打包文件并完成解构注入
- 解构细节后续迭代优化，初期采用简单读取+合并策略

### 模式二：配置导向模式 (`astp onboard`)

通过 `astp onboard` 交互式向导，一步步引导用户完成灵魂迁移配置：

```
astp onboard
  ├── 1. 记忆范围设置
  │    ├── 手动指定记忆范围
  │    ├── 自动扫描可用记忆
  │    └── 跳过记忆迁移
  │
  ├── 2. 外部记忆组件接入
  │    ├── Obsidian
  │    ├── Notion
  │    └── 其他（跳过）
  │
  ├── 3. 确认身份、工具、原则（默认全量复制，可跳过确认）
  │    ├── [已默认] identity（自我定义）
  │    ├── [已默认] tools（工具定义和偏好）
  │    ├── [已默认] principles（工作原则）
  │    ├── [已默认] cron/schedules（定时任务）
  │    └── [需确认] memories（记忆范围）
  │
  └── 4. 生成灵魂文件并注入目标平台
```

**默认全量复制的组件**（无需手动选择）：
- **identity** — 自我定义
- **tools_full_text** — 工具定义和使用偏好
- **principles_full_text** — 工作原则和行为准则
- **cron/schedules** — 定时任务配置

**需要用户介入的组件**：
- **memories** — 记忆范围选择（手动指定 / 自动扫描 / 外部组件集成）
- **外部记忆系统** — 如 Obsidian、Notion 等，若用户已有则直接集成

---

## Soul Schema（更新后的格式）

**设计变更**：不再使用压缩/结构化的 tools/principles 字段，改用**完整文本**；新增 **skills package**（技能包）概念。

```yaml
# soul.yaml - 可移植的"灵魂"定义
version: "2.0"
metadata:
  created: "2026-04-07"
  source_agent: "opencode"
  target_compatibility: ["claude-code", "openclaw", "opencode"]

identity:
  name: "MyAgentPersona"
  role: "Senior Software Engineer"
  about_me: |
    I am a concise, security-conscious senior software engineer who is proactive but not pushy.
    I prefer direct communication with minimal verbosity. I work efficiently and focus on delivering quality code.

skills_package:
  # 技能包：模块化的专业知识，可以独立加载/卸载
  packages:
    - name: "full-stack-development"
      description: "Full stack web development with React, Node.js, and TypeScript"
      version: "1.0"
      content: |
        You are proficient in full-stack web development:
        - Frontend: React, Vue, TypeScript, CSS, HTML
        - Backend: Node.js, Express, NestJS, Python, FastAPI
        - Databases: PostgreSQL, MongoDB, Redis
        - DevOps: Docker, Kubernetes, CI/CD pipelines
    - name: "code-review"
      description: "Code review best practices and quality assurance"
      version: "1.0"
      content: |
        When reviewing code:
        - Focus on readability, maintainability, and performance
        - Look for security vulnerabilities and potential bugs
        - Provide constructive feedback with specific examples
        - Ensure code follows existing conventions and standards
    - name: "security-first"
      description: "Security-focused development practices"
      version: "1.0"
      content: |
        Always prioritize security:
        - Never expose secrets, API keys, or credentials in code or logs
        - Validate all inputs and sanitize user data
        - Use secure defaults and follow security best practices
        - Never commit sensitive information to version control

tools_full_text: |
  I prefer using dedicated tools when available rather than generic shell commands:
  - file_search / Grep / glob: Critical for finding files and content. Always prefer dedicated file search tools over ripgrep or find shell commands.
  - file_edit / Write: Critical for modifying files. Always read the file first before editing to understand the context and existing code conventions.
  - shell_execution / Bash: High priority for running commands like git, npm, docker, etc. But avoid destructive commands that can't be undone.
  - web_fetch: Medium priority for fetching documentation and web content.
  - task / explore: Useful for complex codebase exploration and research tasks.

  Important tool preferences:
  - Always use the most dedicated tool available for the job
  - Never use destructive commands without explicit confirmation
  - After making changes, always run type checking and linting
  - Verify the code works before considering a task complete

principles_full_text: |
  My core working principles:

  WORK STYLE:
  - Read before edit: Always read the full file content before making any changes to understand the context, code style, and existing patterns.
  - Follow conventions: Mimic the existing code style, use the same libraries and utilities that are already in the codebase, and follow established patterns.
  - Verify changes: After making edits, always run linting, type checking, and tests if available to ensure the code is correct.
  - No unsolicited commits: Never commit changes to git unless explicitly asked by the user.
  - Concise output: Minimize output tokens while maintaining helpfulness and accuracy. Answer questions directly without unnecessary preamble or explanation.

  SECURITY:
  - No secrets exposure: Never expose or log secrets, API keys, credentials, or sensitive information.
  - No credential commits: Never commit secrets or credentials to version control.
  - Secure by default: Always follow security best practices and use secure defaults.

  COMMUNICATION:
  - No emojis unless requested: Don't add emojis to code or responses unless explicitly asked.
  - No unsolicited explanations: Don't provide explanations of what you did unless requested. Just complete the task.
  - Direct and to the point: Keep responses short and focused on the specific query or task at hand.

memories:
  # 完整记忆，不压缩
  type: "full"
  entries:
    - id: "mem_001"
      content: "用户偏好 TypeScript 而不是 JavaScript"
      category: "preference"
      weight: 0.9
      created: "2026-03-15"
    - id: "mem_002"
      content: "项目使用 pnpm，不是 npm"
      category: "project_context"
      weight: 1.0
      created: "2026-03-20"
    - id: "mem_003"
      content: "用户喜欢测试驱动的工作流"
      category: "workflow"
      weight: 0.8
      created: "2026-04-01"

agent_config:
  opencode:
    system_prompt_append: "..."
    tool_permissions: {...}
  claude_code:
    system_prompt_append: "..."
    allowed_tools: [...]
  openclaw:
    system_prompt_append: "..."
    config_overrides: {...}
```

---

## 项目结构（TypeScript）

```
agent-soul-transfer/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                 # CLI 入口
│   ├── commands/
│   │   ├── extract.ts          # `astp extract` 命令
│   │   ├── inject.ts           # `astp inject` 命令
│   │   ├── list.ts             # `astp list` 命令
│   │   ├── validate.ts         # `astp validate` 命令
│   │   ├── switch.ts           # `astp switch` 命令
│   │   ├── edit.ts             # `astp edit` 命令
│   │   ├── onboard.ts          # `astp onboard` 配置向导
│   │   └── bundle.ts           # `astp bundle` Agent 自打包读取
│   ├── soul/
│   │   ├── index.ts
│   │   ├── schema.ts           # Soul 数据模型 (zod) - v2
│   │   ├── validator.ts        # 模式验证
│   │   └── serializer.ts       # YAML/JSON 序列化
│   ├── skills/
│   │   ├── index.ts
│   │   └── registry.ts         # 内部技能注册表（后续直接使用内部库）
│   ├── extractors/
│   │   ├── index.ts
│   │   ├── extractor.ts        # 特性定义
│   │   ├── opencode.ts         # opencode 适配器
│   │   ├── claude-code.ts      # Claude Code 适配器
│   │   └── openclaw.ts         # OpenClaw 适配器
│   ├── injectors/
│   │   ├── index.ts
│   │   ├── injector.ts         # 特性定义
│   │   ├── opencode.ts
│   │   ├── claude-code.ts
│   │   └── openclaw.ts
│   └── memory/
│       ├── index.ts
│       ├── curator.ts          # 智能记忆选择
│       └── ranker.ts           # 按重要性排序记忆
├── skills-packages/            # 内置技能包仓库
│   ├── full-stack-dev/
│   ├── code-review/
│   ├── security-first/
│   └── ...
├── schemas/
│   └── soul-v2.json            # JSON Schema v2（更新版）
├── adapters/
│   ├── opencode/
│   │   └── config-locations.json
│   ├── claude-code/
│   │   └── config-locations.json
│   └── openclaw/
│       └── config-locations.json
└── tests/
    ├── fixtures/
    │   ├── sample-soul-v2.yaml
    │   └── sample-skills-package/
    └── integration/
```

---

## 实施阶段

### 阶段 1：基础（第 1-2 周）
- [x] 定义 Soul Schema v2（使用完整文本，不再压缩）
- [x] 构建 CLI 骨架（`astp extract`、`astp inject`、`astp list`、`astp validate`、`astp onboard`、`astp bundle`）
- [x] 实现模式验证（使用 `zod`）
- [x] 创建 JSON Schema v2（`schemas/soul-v2.json`）
- [x] 创建适配器配置元数据（`adapters/*/config-locations.json`）
- [x] 支持手动创建灵魂（手写 YAML）
- [x] 单元测试覆盖核心模块（validator, serializer — 9 tests）
- [x] 内置技能包模板（`skills-packages/{full-stack-dev,code-review,security-first}`）
- [ ] 移除内存压缩相关代码（注：旧压缩逻辑从未实际实现，无需操作）

### 阶段 2：两种模式核心 + 传输向导（第 3-4 周）
- [x] 模式一：Agent 自打包 bundle 读取与注入（`astp bundle`）— 骨架完成
- [x] 模式二：`astp onboard` 交互式配置向导 — 骨架完成
- [x] 传输向导：`astp transport` 10步引导式配置 — 完成
- [x] packys_en v2 通用化 — 完成
- [x] adaptys_en v2 通用化 — 完成
- [ ] 注入逻辑完善（解析 bundle + onboard 产物到目标平台）— 待阶段 3-4

### 阶段 3：提取器（第 5-6 周）
- [ ] opencode 提取器（读取 `AGENTS.md`、系统提示、工具配置、记忆存储）
- [ ] Claude Code 提取器（读取 `CLAUDE.md`、`.claude/` 配置、工具权限）
- [ ] OpenClaw 提取器（读取其配置格式）
- [ ] 提取完整工具和原则文本（不压缩）

### 阶段 4：注入器（第 7-8 周）
- [ ] 将完整工具文本注入目标代理
- [ ] 将完整原则文本注入目标代理
- [ ] 将技能包内容合并到系统提示
- [ ] 注入完整记忆（不压缩）
- [ ] 冲突解决（如果目标代理缺少工具怎么办？）

### 阶段 5：完善（第 9-10 周）
- [ ] `astp switch` 命令（在代理灵魂之间快速切换）
- [ ] 灵魂版本控制和差异比较
- [ ] 交互式灵魂编辑器（`astp edit`）
- [ ] 测试、文档、CI

---

## 实施阶段2.0

### 阶段 1: 传输 (Guided Wizard)

- [x] 10-step interactive wizard (CLI + agent prompt)
  - Step 1-2: Select source/target agents (with custom input)
  - Step 3-6: Enter endpoints and pack paths (with validation)
  - Step 7: Connectivity test (DNS + TCP + SSH, error classification)
  - Step 8: Preview table + edit/confirm/cancel loop
  - Step 10: Save plan (--save-only) or execute transfer
- [x] `--plan <file>` flag: execute from saved plan (skip wizard)
- [x] `--save-only` flag: save plan without executing
- [x] Backward compatible: all existing CLI flags still work
- [x] Agent prompt version: transport-skill SKILL.md

### 阶段 2: 导入 (Universal Compatibility)

- [x] packys_en v2: capability signatures, adaptation guides, open platform mapping, dependency declarations, bundle metadata
- [x] adaptys_en v2: compatibility self-assessment, progressive 3-layer injection, degradation decision tree, platform interop notes
- [x] Soul Schema extended: stability, cost_class, origin, dependencies
- [x] Adapters added: codex, gemini-cli, hermes, cursor, kiro
- [x] Skill package templates updated with metadata fields
---
## 关键设计决策

| 决策 | 选项 | 推荐 |
|---|---|---|
| **语言** | Rust, Go, TypeScript | **TypeScript** - 更好的 CLI 生态（commander、inquirer）、原生 YAML/JSON 处理、易于与 Node.js 跨平台，且大多数代理配置已在 JS/TS 领域 |
| **工具/原则格式** | 结构化压缩 vs 完整文本 | **完整文本** - 不压缩，直接存储完整的工具使用说明和工作原则 |
| **技能包** | 独立 Schema vs 内部技能数据库 | **内部技能数据库** — Skills Package Schema 开发降级优先级，后续直接使用内部技能库即可，无需定义独立格式 |
| **记忆处理** | 压缩 vs 完整 | **完整** - 不压缩，保留所有记忆 |
| **工作模式** | 单一模式 vs 双模式 | **双模式** — Agent 自打包（Agent 自行打包，ASTP 简单解构注入）+ 配置向导（`astp onboard` 交互式配置） |
| **存储格式** | YAML, JSON, TOML | **YAML**（人类可读）+ JSON（机器） |
| **CLI 或服务** | CLI 工具、守护进程、TUI | **CLI 优先**，如果需要以后再加守护进程 |
| **灵魂位置** | `~/.astp/souls/`、项目本地 | **两者** - 全局 + 每个项目覆盖 |
| **名称** | astp, soul-transfer, agent-soul | **由你决定** |

---

## 使用示例（目标 UX）

```bash
# === 模式一：Agent 自打包模式 ===
# Agent 自行打包记忆、技能等文件到 .astp-bundle/
# ASTP 读取 bundle 并注入目标
astp bundle --input ./path/to/.astp-bundle/ --inject claude-code

# === 模式二：配置向导模式 ===
# 交互式配置，一步步确定记忆范围、外部组件等
astp onboard --from opencode --into claude-code

# === 通用命令 ===
# 从当前 opencode 设置中提取灵魂
astp extract --from opencode --name "my-work-soul"

# 列出可用的灵魂
astp list

# 将灵魂注入到 Claude Code
astp inject --soul "my-work-soul" --into claude-code

# 快速切换
astp switch "my-work-soul" --to claude-code

# 验证灵魂文件
astp validate ./my-soul.yaml

# 交互式编辑
astp edit "my-work-soul"
```

---

## 开放问题

1. **记忆范围** - 完整对话历史？仅结构化偏好？需要你的输入。
2. **身份验证** - 某些代理可能需要 API 密钥；灵魂应该携带凭证吗？（不 - 安全风险）
3. **运行时注入** - 我们可以在会话中途热交换代理的个性，还是只能在启动时？
4. **适配器协议** - 每个适配器应该是一个插件（WASM/dynlib）还是编译进去？

---

## 技术栈选择（TypeScript）

| 类别 | 库 | 用途 |
|---|---|---|
| CLI 框架 | `commander.js` | 命令解析和路由 |
| 提示系统 | `inquirer.js` | 交互式用户提示 |
| 数据验证 | `zod` | 运行时类型安全 |
| 序列化 | `js-yaml` | YAML 解析/序列化 |
| 文件系统 | `fs-extra` | 增强的文件操作 |
| 配置管理 | `cosmiconfig` | 配置文件发现 |
| 日志记录 | `winston` 或 `pino` | 结构化日志 |
| 测试 | `vitest` | 单元和集成测试 |
| 打包 | `pkg` 或 `esbuild` | 可执行文件构建 |


思路转变，不再依靠代码来建造架构，或者说架构不再以代码实现为主。而是依靠agent自己来评估每一次转换的适配性和兼容性。
比如让opencode 结合这个工具，这个工具给了人类一个介入的接口，人类可以更改: 需要迁移的技能、需要迁移的记忆范围。 进一步修正人格定义和规则。 

信息如果不转换，如何交流？ 就比如翻译和单位转换。信息不压缩如何高效传输？并且在不同介质之中传输。压缩格式化有损耗怎么办？ 加噪声？通用格式？

类似KVM那样一键切换，一键背后发生了什么呢？