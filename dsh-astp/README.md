# DSH-ASTP Plugin

DeepSeek Harness plugin for Agent Soul Transfer Protocol (ASTP).

## Overview

This plugin integrates ASTP functionality into DeepSeek Harness, allowing you to transfer AI agent souls between different platforms through natural language commands.

## Features

- **List supported agents**: Query all available AI agent platforms
- **Agent info**: Get detailed information about specific agent platforms
- **Transport**: Transfer agent souls between source and target platforms
- **Validate**: Validate ASTP soul YAML files
- **List souls**: List all available soul files in ASTP storage

## Installation

### From local directory

```bash
dsh plugin --profile <profile-name> add ./dsh-astp
```

### From npm (when published)

```bash
dsh plugin --profile <profile-name> add dsh-astp-plugin
```

## Configuration

Add configuration in your `cordis.yml`:

```yaml
- insert:
    - id: astp
      name: dsh-astp-plugin
      config:
        astpPath: 'astp'           # ASTP CLI path
        defaultTimeout: 300        # Default timeout in seconds
```

## Available Tools

### 1. `astp_list_agents`

List all supported AI agent platforms.

**Example:**
```
List all supported agents in ASTP
```

### 2. `astp_agent_info`

Get detailed information about a specific agent platform.

**Parameters:**
- `agentName` (required): Agent name to get info for

**Example:**
```
Get information about the openclaw agent
```

### 3. `astp_transport`

Transfer an AI agent soul from source to target.

**Parameters:**
- `sourceAgent` (required): Source agent name
- `sourceHost` (required): Source SSH endpoint (user@host)
- `sourcePath` (required): Source bundle path
- `targetAgent` (optional): Target agent name
- `targetHost` (optional): Target SSH endpoint
- `targetPath` (optional): Target bundle path
- `saveLocally` (optional): Save bundle locally without transfer
- `skipCheck` (optional): Skip connectivity validation

**Examples:**
```
Transfer my openclaw agent from user@source-host to claude-code on user@target-host
```

```
Backup my openclaw agent soul locally
```

### 4. `astp_validate`

Validate an ASTP soul YAML file.

**Parameters:**
- `soulPath` (required): Path to the soul YAML file

**Example:**
```
Validate the soul file at /path/to/soul.yaml
```

### 5. `astp_list_souls`

List all available soul files in ASTP storage.

**Example:**
```
List all available souls
```

## Supported Agents

| Agent | CLI Command | Pipe Mode | Config Location | Support |
|-------|-------------|-----------|-----------------|---------|
| opencode | `opencode` | `-p` | `~/.config/opencode/AGENTS.md` | Full |
| claude-code | `claude` | `-p` | `~/.claude/CLAUDE.md` | Full |
| openclaw | `openclaw` | `--agent <id> -m --local` | `~/.openclaw/workspace/AGENTS.md` | Full |
| codex | `codex exec` | `exec` | `~/.codex/AGENTS.md` | Full |
| hermes | `hermes` | `-z` | `~/.hermes/AGENTS.md` | Full |
| gemini-cli | `gemini` | TBD | `~/.gemini/GEMINI.md` | Pending |
| cursor | No CLI | N/A | `./.cursor/rules/` | File-copy only |
| kiro | No CLI | N/A | `./.kiro/steering/` | File-copy only |

## Prerequisites

- ASTP CLI must be installed and accessible in PATH (or configure `astpPath`)
- SSH access to source/target hosts for transport operations
- Proper SSH key authentication configured

## Development

### Build

```bash
cd dsh-astp
tsc index.ts --outDir . --module esnext --target es2020 --moduleResolution node
```

### Test locally

```bash
dsh plugin --profile test add ./dsh-astp
dsh --profile test
```

## License

MIT
