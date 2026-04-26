# Agent Soul Transfer Protocol (ASTP)

[English](README.md) | [简体中文](README.zh.md)

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

### Build from Source

```bash
# Clone the repository
git clone https://github.com/tatuke/agent-switch.git
cd agent-switch

# Install dependencies
npm install

# Build
npm run build
```

After building, the CLI executable is at `dist/main.js`.

## Usage

### Run directly (after build)

```bash
node dist/main.js <command> [options]
```

### Or link globally (optional)

```bash
npm link
astp <command> [options]
```

### Commands

#### `astp transport` — Interactive transfer wizard

Full 3-step interactive flow: configure source/target → SSH session → transfer decision.

```bash
node dist/main.js transport
```

Step-by-step wizard:
1. **Step 0-8**: Configure source agent, target agent, SSH endpoints, connectivity test
2. **Step 9**: Preview adaptys compatibility matrix (pre-computed from adapter profiles)
3. **Step 10**: SSH into source host, launch agent CLI session, execute packys packing
4. **Step 11**: Collect bundle, ask user whether to transfer immediately

#### `astp transport` — With flags (skip wizard steps)

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

#### `astp bundle` — Validate a bundle directory

```bash
node dist/main.js bundle --input .astp-bundle
node dist/main.js bundle --input .astp-bundle --inject claude-code
```

#### `astp validate` — Validate a soul YAML file

```bash
node dist/main.js validate ./soul.yaml
```

#### `astp list` — List available souls

```bash
node dist/main.js list
```

## Supported Agents

| Agent | CLI Session | Config Location | Notes |
|---|---|---|---|
| opencode | `opencode -p` | `~/.config/opencode/AGENTS.md` | Full pipe mode support |
| claude-code | `claude -p` | `~/.claude/CLAUDE.md` | Full pipe mode support |
| codex | `codex exec` | `~/.codex/AGENTS.md` | Full pipe mode support |
| openclaw | `openclaw agent -m --local` | `~/.openclaw/workspace/AGENTS.md` | Full pipe mode support |
| cursor | No CLI | `./.cursor/rules/` | File-copy mode only |
| gemini-cli | `gemini` (TBD) | `~/.gemini/GEMINI.md` | Pipe mode TBD |
| kiro | No CLI | `./.kiro/steering/` | File-copy mode only |

## Project Structure

```
src/
├── main.ts              # CLI entry (commander.js)
├── commands/
│   ├── transport.ts      # Interactive transport wizard (Steps 1-12)
│   ├── bundle.ts         # Bundle validation and integrity check
│   └── transfer-bundle.ts # Step 2: SCP transfer to target
├── soul/
│   ├── schema.ts         # Zod schemas (Soul v2, Profile, AdaptysMeta)
│   ├── serializer.ts     # YAML/JSON serialization
│   └── validator.ts      # Schema validation
├── adaptys/
│   ├── profile-loader.ts # Load agent profiles from adapters/
│   ├── matrix.ts         # Compute compatibility matrix
│   ├── template.ts       # Inject pre-computed baseline into adaptys
│   └── generate.ts       # Generate adaptys.md + adaptys-meta.yaml
├── session/
│   ├── prompt-builder.ts # Build agent-specific pack session prompts
│   ├── ssh-exec.ts       # SSH command execution with escaping
│   ├── monitor.ts        # Bundle completion monitoring
│   └── session-launcher.ts # Orchestrate full SSH session flow
├── transport/
│   └── index.ts          # Transport plan model and helpers
└── utils/
    ├── config.ts         # Paths, constants, adapter helpers
    └── logger.ts         # Simple logger

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

## Development

```bash
# Watch mode (tsx)
npm run dev

# Run tests
npm run test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Technical Notes and Future Plans

1. Memory and skills summarization and transfer is a complex and resource-intensive task. I personally prefer using internal skill networks and external memory components (knowledge bases, memory libraries).
2. The project has only been verified among three agent tools; not tested on more or newer agent components.
3. When an agent tool updates (repository source), how to adapt and flexibly schedule.

## License

MIT