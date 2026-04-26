# Agent Soul Transfer Protocol (ASTP)

[English](README.md) | [简体中文](README.zh.md)

可移植的 AI 代理人格和身份、工作原则和安全守则转移系统。

## 背景

因为我在使用一些 agent 时，遇到更新 agent 后整个工具无法启动和响应的情况，特别是一些更新很频繁的。每次都包含了很多"改进"的项目。为了工作的可持续性，我不得不思考备份、恢复转移的可能性。同时兼顾硬件损坏后不得不转移的可能性。不仅仅是工作成果，还有我在长久和 agent 工作过程中积累下来的"默契"——节省 prompt 的定义、安全边界原则、代码规范、思考路径等。

所以我一开始打算开发一整套手动配置的架构来进行人工指导这个备份和转移的过程。后来我觉得，为什么不让 agent 之间自己约定一套通用的转移规范？当我使用三个 agent 工具之间进行了多轮的讨论（opencode、claude code、openclaw），并经过我个人的修改后，形成了这一套转移"规范"。

## 给 AI Agent 看的介绍

该项目目前使用纯粹 md 文档作为转移过程中的说明和规范。当需要打包你自己时，请阅读 [packys_en.md](./packys_en.md)。当需要接收转移文件并更新自身时，请阅读 [adaptys_en.md](./adaptys_en.md)。

有必要在采取任何动作前，先向你的用户解释、总结项目文件中的功能和接下来的动作。如果得到允许执行，严格按照文件中的说明执行，未得到许可时，不要擅自做出任何删除自身规则文件或者工作文件的动作。

## 安装与构建

本项目尚未发布为 npm 包，直接从源码编译使用。

### 前置要求

- Node.js >= 20
- npm 或 pnpm

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/tatuke/agent-switch.git
cd agent-switch

# 安装依赖
npm install

# 构建
npm run build
```

构建完成后，CLI 可执行文件位于 `dist/main.js`。

## 使用方式

### 直接运行（构建后）

```bash
node dist/main.js <命令> [选项]
```

### 或全局链接（可选）

```bash
npm link
astp <命令> [选项]
```

### 命令

#### `astp transport` — 交互式传输向导

完整的 3 步交互式流程：配置源/目标 → SSH session → 传输决策。

```bash
node dist/main.js transport
```

逐步向导：
1. **步骤 0-8**：配置源端 agent、目标端 agent、SSH 端点、连接测试
2. **步骤 9**：预览 adaptys 兼容矩阵（从 adapter profiles 预计算）
3. **步骤 10**：SSH 到源端主机，启动 agent CLI session，执行 packys 打包
4. **步骤 11**：收集 bundle，询问用户是否立即传输

#### `astp transport` — 使用 flag（跳过向导步骤）

```bash
node dist/main.js transport \
  --source-agent opencode \
  --source-host user@192.168.1.100 \
  --source-path /home/user/project \
  --source-port 22 \
  --target-agent claude-code \
  --target-host user@192.168.1.101 \
  --target-path /home/user/project \
  --target-port 22 \
  --skip-check \
  --save-only
```

#### `astp bundle` — 验证 bundle 目录

```bash
node dist/main.js bundle --input .astp-bundle
node dist/main.js bundle --input .astp-bundle --inject claude-code
```

#### `astp validate` — 验证 soul YAML 文件

```bash
node dist/main.js validate ./soul.yaml
```

#### `astp list` — 列出可用的 souls

```bash
node dist/main.js list
```

## 支持的 Agent

| Agent | CLI Session | 配置位置 | 备注 |
|---|---|---|---|
| opencode | `opencode -p` | `~/.config/opencode/AGENTS.md` | 完整管道模式支持 |
| claude-code | `claude -p` | `~/.claude/CLAUDE.md` | 完整管道模式支持 |
| codex | `codex exec` | `~/.codex/AGENTS.md` | 完整管道模式支持 |
| openclaw | `openclaw agent -m --local` | `~/.openclaw/workspace/AGENTS.md` | 完整管道模式支持 |
| cursor | 无 CLI | `./.cursor/rules/` | 仅文件复制模式 |
| gemini-cli | `gemini`（待确认） | `~/.gemini/GEMINI.md` | 管道模式待确认 |
| kiro | 无 CLI | `./.kiro/steering/` | 仅文件复制模式 |

## 项目结构

```
src/
├── main.ts              # CLI 入口 (commander.js)
├── commands/
│   ├── transport.ts      # 交互式传输向导 (步骤 1-12)
│   ├── bundle.ts         # Bundle 验证和完整性检查
│   └── transfer-bundle.ts # 步骤 2：SCP 传输到目标端
├── soul/
│   ├── schema.ts         # Zod schemas (Soul v2, Profile, AdaptysMeta)
│   ├── serializer.ts     # YAML/JSON 序列化
│   └── validator.ts      # Schema 验证
├── adaptys/
│   ├── profile-loader.ts # 从 adapters/ 加载 agent profiles
│   ├── matrix.ts         # 计算兼容矩阵
│   ├── template.ts       # 将预计算基线注入 adaptys
│   └── generate.ts       # 生成 adaptys.md + adaptys-meta.yaml
├── session/
│   ├── prompt-builder.ts # 构建 agent 特定的打包 session prompt
│   ├── ssh-exec.ts       # SSH 命令执行（含 shell escaping）
│   ├── monitor.ts        # Bundle 完成监控
│   └── session-launcher.ts # 编排完整的 SSH session 流程
├── transport/
│   └── index.ts          # Transport plan 模型和辅助函数
└── utils/
    ├── config.ts         # 路径、常量、适配器辅助函数
    └── logger.ts         # 简单日志器

adapters/
├── opencode/     # profile.json + config-locations.json
├── claude-code/  # profile.json + config-locations.json
├── codex/        # profile.json + config-locations.json
├── openclaw/     # profile.json + config-locations.json
├── cursor/       # profile.json + config-locations.json
├── gemini-cli/   # profile.json + config-locations.json
├── kiro/         # profile.json + config-locations.json
├── hermes/       # profile.json + config-locations.json
```

## 开发

```bash
# Watch 模式 (tsx)
npm run dev

# 运行测试
npm run test

# 类型检查
npm run typecheck

# Lint
npm run lint
```

## 技术说明和后续计划

1. 现如今考虑到 memory 和 skills 的总结和转移是一项稍显复杂和有巨大耗费的工程。我个人更倾向于使用内网 skill 网络和外接 memory 组件（知识库和记忆库组件）。
2. 项目只经过了三个 agent 工具之间的验证和测试，没在更多、更新的 agent 组件上进行测试验证。
3. 当 agent 工具更新（仓库源头），又该如何适配和灵活调度。

## 许可证

MIT