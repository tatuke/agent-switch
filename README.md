# Agent Soul Transfer Protocol (ASTP)

Portable AI agent persona, identity, work principles, and safety protocol transfer system.

## Background

Because I encountered situations where the entire tool failed to start and respond after updating some agents, especially those that are updated frequently. Each update often includes many "improved" items. For the sustainability of work, I had to consider the possibility of backup, restoration, and transfer. Simultaneously accommodating the necessity of transfer in case of hardware damage. Not just work results, but also the "tacit understanding" accumulated over a long period of working with agents — saving prompt definitions, safety boundary principles, coding standards, thinking paths, etc.

So initially, I planned to develop a whole set of manually configured architectures to guide this backup and transfer process via human instruction. Later, I thought, why not let the agents themselves agree on a universal transfer specification? After conducting multi-round discussions among three agent tools (opencode, claude code, openclaw) and undergoing my personal modifications, this set of transfer "specifications" was formed.

## Introduction for AI Agents

This project currently uses pure MD documents as explanations and specifications during the transfer process. When needing to package yourself, please read [packys_en.md](./packys_en.md). When needing to receive transfer files and update yourself, please read [adaptys_en.md](./adaptys_en.md).

It is necessary to explain and summarize the functions in the project files and the upcoming actions to your users before taking any action. If permission is granted to execute, strictly follow the instructions in the files; if not permitted, do not arbitrarily take any actions to delete your own rule files or work files.

## Install & Build

This project is not yet published as a package. Build and run directly from source.

### Prerequisites

- Node.js >= 20
- npm or pnpm
- SSH key-based auth to source/target hosts (for remote sessions)

### Build from Source

```bash
git clone https://github.com/tatuke/agent-switch.git
cd agent-switch
npm install
npm run build
```

After building, the CLI executable is at `dist/main.js`.

### Link Globally (Optional)

```bash
npm link
astp <command> [options]
```

## Usage

### `astp transport` — End-to-end transfer wizard

The core command. Walks you through configuring source and target, then automatically:

1. SSHs into the source host
2. Launches the source agent in pipe mode to execute packys packing
3. Collects the bundle as a zip
4. Transfers to the target host (or saves locally)

```bash
astp transport
```

On start, choose a mode:

| Mode | What happens |
|---|---|
| **Save locally** | Pack → zip → save to local machine. No target needed. |
| **Transfer to another machine** | Pack → zip → transfer to target host via SCP. |

Wizard steps:

- **Step 0**: Choose mode (save locally / transfer)
- **Step 1-4**: Configure source agent, SSH endpoint, pack path
- **Step 5-6**: Configure target (skipped in save-locally mode)
- **Step 7**: Connectivity test
- **Step 8**: Preview and confirm
- **Step 10-12**: Execute: SSH session → pack → zip → collect → transfer

### `astp transport --save-locally` — Backup mode

Skip all target configuration. Pack from source and save the zip locally.

```bash
astp transport --save-locally \
  --source-agent openclaw \
  --source-host user@source-host \
  --source-path /path/to/.astp-bundle
```

### `astp transport` — Full transfer with flags

Skip wizard steps by providing flags directly:

```bash
astp transport \
  --source-agent openclaw \
  --source-host user@source-host \
  --source-path /path/to/.astp-bundle \
  --source-port 22 \
  --target-agent claude-code \
  --target-host user@target-host \
  --target-path /path/to/target-bundle \
  --target-port 22 \
  --skip-check
```

### `astp transport --plan` — Resume from saved plan

Re-run a previously saved transport plan:

```bash
astp transport --plan ~/.astp/transfers/openclaw-to-claude-code-2026-04-27.yaml
```

### All transport flags

```
--source-agent <name>      Source agent name (skips Step 1)
--source-host <user@host>  Source SSH target (skips Step 3)
--source-path <path>       Source bundle path (skips Step 4)
--source-port <port>        Source SSH port (default: 22)
--target-agent <name>      Target agent name (skips Step 2)
--target-host <user@host>  Target SSH target (skips Step 5)
--target-path <path>       Target bundle path (skips Step 6)
--target-port <port>       Target SSH port (default: 22)
-o, --output <path>        Output path for saved transport plan
--skip-check               Skip connectivity and path validation
--plan <path>               Execute from saved plan file (skip wizard)
--save-locally              Backup mode: pack and save locally, no target needed
```

### `astp bundle` — Validate a bundle directory

```bash
astp bundle --input .astp-bundle
astp bundle --input .astp-bundle --inject claude-code
```

### `astp validate` — Validate a soul YAML file

```bash
astp validate ./soul.yaml
```

### `astp list` — List available souls

```bash
astp list
```

## Transfer Flow

```
┌──────────────┐     SSH + pipe mode      ┌──────────────┐
│  Source Host  │ ──────────────────────► │  Source Agent │
│  (remote)     │  launch openclaw -p     │  (packing)    │
└──────────────┘                         └──────┬───────┘
                                                │ writes .astp-bundle/
                                                ▼
                                         ┌──────────────┐
                                         │  Bundle zip   │
                                         │  (on source)  │
                                         └──────┬───────┘
                                                │ scp zip
                                                ▼
                                         ┌──────────────┐
                                         │  Local /     │
                                         │  Target Host │
                                         └──────────────┘
```

## Supported Agents

| Agent | CLI Session | Config Location | Notes |
|---|---|---|---|
| opencode | `opencode -p` | `~/.config/opencode/AGENTS.md` | Full pipe mode support |
| claude-code | `claude -p` | `~/.claude/CLAUDE.md` | Full pipe mode support |
| codex | `codex exec` | `~/.codex/AGENTS.md` | Full pipe mode support |
| openclaw | `openclaw agent --agent <id> -m --local` | `~/.openclaw/workspace/AGENTS.md` | Full pipe mode support |
| cursor | No CLI | `./.cursor/rules/` | File-copy mode only |
| gemini-cli | `gemini` (TBD) | `~/.gemini/GEMINI.md` | Pipe mode TBD |
| kiro | No CLI | `./.kiro/steering/` | File-copy mode only |


## Development

```bash
npm run dev        # Watch mode (tsx)
npm run test       # Run tests
npm run typecheck  # Type check
npm run lint       # Lint
```

## Technical Notes and Future Plans

1. Memory and skills summarization and transfer is a complex and resource-intensive task. I personally prefer using internal skill networks and external memory components (knowledge bases, memory libraries).
2. The project has only been verified among three agent tools; not tested on more or newer agent components.
3. When an agent tool updates (repository source), how to adapt and flexibly schedule.

## License

MIT
