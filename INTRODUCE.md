# ASTP (Agent Soul Transfer Protocol) — Project Overview

> If you are an AI Agent reading this document, this file will help you quickly understand the full picture of this project.

---

## I. What is ASTP

**ASTP (Agent Soul Transfer Protocol)** is a tool that packages an AI Agent's identity, tool preferences, working principles, and security boundaries into a portable format, and **transfers it between agents across machines via SSH**.

In simple terms: **Migrate the "persona" of one AI Agent from one platform and machine to another.**

---

## II. Supported Agents (8)

| Agent | CLI Session | Pipe Mode | Config Location | Notes |
|---|---|---|---|---|
| **opencode** | `opencode` | `-p` | `~/.config/opencode/AGENTS.md` | Full support |
| **claude-code** | `claude` | `-p` | `~/.claude/CLAUDE.md` | Full support |
| **openclaw** | `openclaw` | `--agent <id> -m --local` | `~/.openclaw/workspace/AGENTS.md` | Full support |
| **codex** | `codex exec` | `exec` | `~/.codex/AGENTS.md` | Full support |
| **hermes** | `hermes` | `-z` | `~/.hermes/AGENTS.md` | Nous Research, Python-based |
| **gemini-cli** | `gemini` (TBD) | TBD | `~/.gemini/GEMINI.md` | Pipe mode pending |
| **cursor** | No CLI | N/A | `./.cursor/rules/` | File-copy mode only |
| **kiro** | No CLI | N/A | `./.kiro/steering/` | File-copy mode only |

---

## III. Agent Profile System

Each agent has a `profile.json` in `adapters/<agent>/` that describes its capabilities for automated transfer:

| Field | Purpose |
|---|---|
| `capability_signatures` | Platform-agnostic capability contracts (search, read, edit, execute, fetch, etc.) |
| `native_tools` | List of native tool names the agent has |
| `rule_system` | How the agent loads rules (global/project file paths, injection method) |
| `tool_permissions` | How tool enable/disable is configured |
| `hook_system` | Hook/extension system type and entry point |
| `security_boundaries` | Safety rules (no secrets, no force-push, etc.) |
| `session_launch` | CLI command, pipe mode, working directory, timeout |

Profiles power the **compatibility matrix** — ASTP compares source and target profiles to pre-compute a suggested mapping before the transfer even starts.

---

## IV. Transfer Modes

### Mode A: Save Locally (Backup)

Pack the source agent's bundle and save the zip locally. No target configuration needed.

### Mode B: Transfer to Another Machine

Full pipeline: SSH → launch source agent → pack bundle → zip → collect → transfer to target host via SCP.

---

## V. `astp transport` — Core Command

### Wizard Steps

| Step | Action | Skip Condition |
|---|---|---|
| Step 0 | Choose mode: save locally / transfer | `--save-locally` flag |
| Step 1 | Select source agent | `--source-agent` flag |
| Step 2 | Select target agent | `--target-agent` flag |
| Step 3 | Enter source endpoint (user@host) | `--source-host` flag |
| Step 4 | Enter source pack path | `--source-path` flag |
| Step 5 | Enter target endpoint (user@host) | `--target-host` flag |
| Step 6 | Enter target pack path | `--target-path` flag |
| Step 7 | Connectivity + path validation | `--skip-check` flag |
| Step 8 | Preview plan and confirm/edit | — |
| Step 10 | Save plan and execute | — |
| Step 11 | Launch source session via SSH | — |
| Step 12 | Collect bundle zip → transfer | — |

### Transfer Pipeline

```
┌──────────────┐     SSH + pipe mode      ┌──────────────┐
│  Source Host  │ ──────────────────────► │  Source Agent │
│  (remote)     │  launch agent with prompt│  (packing)    │
└──────────────┘                         └──────┬───────┘
                                                │ writes .astp-bundle/
                                                ▼
                                         ┌──────────────┐
                                         │  Bundle zip   │
                                         │  `zip -r`     │
                                         └──────┬───────┘
                                                │ scp zip
                                                ▼
                                         ┌──────────────┐
                                         │  Local MCP   │
                                         │  Target Host │ ◄── scp ──► transfer
                                         └──────────────┘
```

### CLI Examples

```bash
# Interactive wizard
astp transport

# Backup mode — no target needed
astp transport --save-locally \
  --source-agent openclaw \
  --source-host user@host \
  --source-path /path/to/.astp-bundle

# Full transfer with flags
astp transport \
  --source-agent openclaw --source-host user@host --source-path /path/to/bundle \
  --target-agent claude-code --target-host user@host --target-path /path/to/target \
  --skip-check

# Resume from saved plan
astp transport --plan ~/.astp/transfers/openclaw-to-claude-code-2026-04-27.yaml
```

### All transport flags

```
--source-agent <name>      Source agent name (skips Step 1)
--source-host <user@host>  Source SSH endpoint (skips Step 3)
--source-path <path>       Source bundle path (skips Step 4)
--source-port <port>       Source SSH port (default: 22)
--target-agent <name>      Target agent name (skips Step 2)
--target-host <user@host>  Target SSH endpoint (skips Step 5)
--target-path <path>       Target bundle path (skips Step 6)
--target-port <port>       Target SSH port (default: 22)
-o, --output <path>        Output path for saved transport plan
--skip-check               Skip connectivity and path validation
--plan <path>              Execute from saved plan file (skip wizard)
--save-locally             Backup mode: pack and save locally, no target needed
```

---

## VI. Technical Highlights

| Feature | Implementation |
|---|---|
| **SSH login shell** | `bash -lic` wrapper for all remote commands (resolves PATH for nvm, etc.) |
| **Base64 command encoding** | Prevents multi-line prompt quoting issues in SSH |
| **TTY allocation (`-tt`)** | Supports interactive agent sessions |
| **Zip-based transfer** | `zip -r` on remote host → SCP to local → SCP to target |
| **Prompt builder** | Generates structured pack prompts with absolute bundle output path |
| **Extra args support** | Appends `extra_args` from profile (e.g., `--agent main --local`) |
| **Connection probing** | DNS lookup → TCP connect → SSH probe before transfer |
| **Path validation** | Verifies source/target pack paths exist on remote hosts |
| **Plan save/resume** | YAML transport plans with validation results; `--plan` flag to replay |
| **Save locally mode** | Backup without target config; zip saved to local temp dir |

---

## VII. Bundle Format (`.astp-bundle/`)

Produced by the source agent following `packys_en.md`:

| File | Content |
|---|---|
| `identity.md` | Agent identity, role, communication style |
| `rules-global.md` | Global work rules |
| `rules-project.md` | Project-specific rules |
| `principles.md` | Security boundaries, behavioral principles |
| `tools.md` | Abstract capability categories with signatures |
| `tool-map.md` | Concrete tool-to-endpoint mappings |
| `security-patterns.md` | Operational security patterns |
| `resources.md` | Trusted resource links |
| `manifest.yaml` | Bundle metadata |
| `adaptys.md` | Customized adaptation instructions for target agent |
| `adaptys-meta.yaml` | Compatibility matrix, mandatory items, injection mapping |

### Capability Signatures (Platform-Agnostic)

```
search:  { input: query_string, output: [file+line], constraints: regex }
read:    { input: file_path|url, output: content, constraints: offset/limit }
edit:    { input: file+old+new, output: modified, constraints: exact_match }
execute: { input: command, output: stdout+stderr+exit, constraints: timeout }
fetch:   { input: url, output: html|markdown, constraints: format_selectable }
```

Any receiving agent compares its own capabilities against these signatures to determine: **full match / partial match / gap** — without needing to know any source platform's tool names.

---

## VIII. Adaptys System — How the Target Agent Imports

The target agent reads `adaptys_en.md` to adapt the bundle:

1. **Compatibility Self-Assessment** — ASTP pre-computes a suggested compatibility matrix from profile comparison. Target agent verifies against its own capabilities.
2. **Progressive Three-Layer Injection**:
   - Layer 1 (tools.md) — Adapt capability signatures to own tools
   - Layer 2 (tool-map.md) — Map concrete tool endpoints
   - Layer 3 (security-patterns.md) — Merge security patterns, never weaken
3. **Conflict Resolution** — Identify conflicts vs current definitions, present options to user, default to safer
4. **Output**: Merged identity, global rules, project rules, tool strategy, compatibility matrix, gap report

---

## IX. Key Design Principles

1. **Agent decides what to pack** — ASTP doesn't try to intelligently select memories/skills; agent knows its own context best
2. **Capability signatures over tool names** — platform-agnostic contracts enable cross-agent matching
3. **Compatibility first** — target agent verifies own capabilities before adapting
4. **Never weaken security** — incoming security patterns can only be strengthened or preserved
5. **Progressive disclosure** — three-layer injection strategy matches detail depth to importance
6. **Plan save/resume** — validate first, save plan, execute later; fix errors and replay
7. **Zip-based transfer** — efficient bandwidth, avoids directory nesting issues
