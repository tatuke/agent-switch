# Agent Soul Transfer Protocol (ASTP)

[English](README.md) | [简体中文](README.zh.md)

可移植的 AI 代理人格和身份、工作原则和安全守则转移系统。

## 背景

因为我在使用一些 agent 时，遇到更新 agent 后整个工具无法启动和响应的情况，特别是一些更新很频繁的。每次都包含了很多"改进"的项目。为了工作的可持续性，我不得不思考备份、恢复转移的可能性。同时兼顾硬件损坏后不得不转移的可能性。不仅仅是工作成果，还有我在长久和 agent 工作过程中积累下来的"默契"——节省 prompt 的定义、安全边界原则、代码规范、思考路径等。

所以我一开始打算开发一整套手动配置的架构来进行人工指导这个备份和转移的过程。后来我觉得，为什么不让 agent 之间自己约定一套通用的转移规范？当我使用三个 agent 工具之间进行了多轮的讨论（opencode、claude code、openclaw），并经过我个人的修改后，形成了这一套转移"规范"。

## 给 AI Agent 看的介绍

该项目目前使用纯粹 md 文档作为转移过程中的说明和规范。当需要打包你自己时，请阅读 [packys_en.md](./packys_en.md)。当需要接收转移文件并更新自身时，请阅读 [adaptys_en.md](./adaptys_en.md)。

有必要在采取任何动作前，先向你的用户解释、总结项目文件中的功能和接下来的动作。如果得到允许执行，严格按照文件中的说明执行，未得到许可时，不要擅自做出任何删除自身规则文件或者工作文件的动作。

packys 还支持可选的密钥文件收集：明文密钥文件（SSH 密钥、`.env`、证书、token 等）仅在明确提醒并经用户确认后才会打包；密钥存储库（Vaultwarden/Bitwarden、KeePass、`pass`、sqlite 等）提供导出迁移 / 备份数据文件 / 跳过三种选项。详见 [packys_en.md](./packys_en.md) 的 "Secret & Key File Handling" 章节。

## 安装

### 前置要求

- Node.js >= 20
- npm 或 pnpm
- 源/目标主机需 SSH 密钥认证（用于远程 session）

### 从 npm 安装

```bash
npm install -g agent-soul-transfer
astp <命令> [选项]
```

或不全局安装，直接运行：

```bash
npx agent-soul-transfer <命令> [选项]
```

### 从源码构建

```bash
git clone https://github.com/tatuke/agent-switch.git
cd agent-switch
npm install
npm run build
```

构建完成后，CLI 可执行文件位于 `dist/main.js`。

### 全局链接（可选）

```bash
npm link
astp <命令> [选项]
```

### 命令

#### `astp transport` — 端到端传输向导

核心命令。引导配置源端和目标端，然后自动：

1. SSH 连接源端主机
2. 以管道模式启动源端 agent 执行 packys 打包
3. 将 bundle 收集为 zip
4. 传输到目标端主机（或保存到本地）

```bash
astp transport
```

启动时选择模式：

| 模式 | 说明 |
|---|---|
| **保存到本地** | 打包 → zip → 保存到本机。无需配置目标端。 |
| **传输到其他机器** | 打包 → zip → 通过 SCP 传输到目标端主机。 |

向导步骤：
- **步骤 0**：选择模式（保存到本地 / 传输）
- **步骤 1-4**：配置源端 agent、SSH 端点、打包路径
- **步骤 5-6**：配置目标端（保存到本地模式下跳过）
- **步骤 7**：连接测试
- **步骤 8**：预览并确认
- **步骤 10-12**：执行：SSH session → 打包 → zip → 收集 → 传输

#### `astp transport --save-locally` — 备份模式

跳过所有目标端配置。从源端打包并将 zip 保存到本地。

```bash
astp transport --save-locally \
  --source-agent openclaw \
  --source-host user@source-host \
  --source-path /path/to/.astp-bundle
```

#### `astp transport` — 使用 flag 完整传输

直接提供 flag，跳过向导步骤：

```bash
astp transport \
  --source-agent opencode \
  --source-host user@source-host \
  --source-path /path/to/.astp-bundle \
  --source-port 22 \
  --target-agent claude-code \
  --target-host user@target-host \
  --target-path /path/to/target-bundle \
  --target-port 22 \
  --skip-check
```

#### `astp transport --plan` — 从已保存的 plan 恢复

重新执行之前保存的传输 plan：

```bash
astp transport --plan ~/.astp/transfers/openclaw-to-claude-code-2026-04-27.yaml
```

#### 全部 transport flag

```
--source-agent <name>      源端 agent 名称（跳过步骤 1）
--source-host <user@host>  源端 SSH 目标（跳过步骤 3）
--source-path <path>       源端 bundle 路径（跳过步骤 4）
--source-port <port>       源端 SSH 端口（默认 22）
--target-agent <name>      目标端 agent 名称（跳过步骤 2）
--target-host <user@host>  目标端 SSH 目标（跳过步骤 5）
--target-path <path>       目标端 bundle 路径（跳过步骤 6）
--target-port <port>       目标端 SSH 端口（默认 22）
-o, --output <path>        保存传输 plan 的输出路径
--skip-check               跳过连接与路径校验
--plan <path>              从已保存的 plan 文件执行（跳过向导）
--save-locally             备份模式：打包并保存到本地，无需目标端
```

#### `astp bundle` — 验证 bundle 目录

```bash
astp bundle --input .astp-bundle
astp bundle --input .astp-bundle --inject claude-code
```

#### `astp validate` — 验证 soul YAML 文件

```bash
astp validate ./soul.yaml
```

#### `astp list` — 列出可用的 souls

```bash
astp list
```

## 支持的 Agent

| Agent | CLI Session | 配置位置 | 备注 |
|---|---|---|---|
| opencode | `opencode -p` | `~/.config/opencode/AGENTS.md` | 完整管道模式支持 |
| claude-code | `claude -p` | `~/.claude/CLAUDE.md` | 完整管道模式支持 |
| codex | `codex exec` | `~/.codex/AGENTS.md` | 完整管道模式支持 |
| openclaw | `openclaw agent -m --local` | `~/.openclaw/workspace/AGENTS.md` | 完整管道模式支持 |
| deepseek-harness | `dsh --profile <profile-name>` | `cordis.yml` | 通过 [`dsh-astp`](./dsh-astp) 插件支持 |
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