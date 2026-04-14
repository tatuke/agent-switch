# ASTP (Agent Soul Transfer Protocol) — AI Agent Project Overview

> If you are an AI Agent reading this document, this file will help you quickly understand the full picture of this project.

## I. What is ASTP

**ASTP (Agent Soul Transfer Protocol)** is a CLI tool used to package an AI Agent's "Soul"—including identity, tool preferences, working principles, memories, and skills—into a **portable universal format**, and then **inject it into different agent platforms**.

In simple terms: **Migrate the "persona" of one AI Agent from one platform to another.**

### Supported Platforms (Adapters)

- **opencode**
- **claude-code**
- **openclaw**
- And more AI agent platforms in the future

### Core Concept: Composition of the "Soul"

A "Soul" consists of the following core components:

| Component | Description |
|---|---|
| **identity** | The agent's name, role, and self-introduction |
| **skills_package** | Modular skill packs (e.g., full-stack development, code review, secure development, etc.) |
| **tools_full_text** | The agent's tool usage preferences and complete descriptions (uncompressed) |
| **principles_full_text** | Working principles and behavioral guidelines (uncompressed) |
| **memories** | The agent's complete memory (user preferences, project context, workflows, etc.) |
| **agent_config** | Platform-specific configuration adaptations (system prompts, tool permissions, etc.) |

---

## II. Two Working Modes

### Mode 1: Agent Self-Packaging Mode

In this mode, the **source AI Agent itself packages necessary memory, skills, and other files**, while ASTP only needs to perform a simple deconstruction of these packaged files before injecting them into the target platform.

```
Source Agent Self-Packaging (.astp-bundle/)  →  ASTP Deconstruction  →  Injection into Target Platform
```

- The Agent decides in the session which memories and skills need to be migrated.
- ASTP does not need complex intelligent selection logic; it only needs to read the packaged files and complete the injection.
- Suitable for scenarios where the Agent has a full understanding of its own context.

### Mode 2: Configuration-Oriented Mode (`astp onboard`)

Use `astp onboard` to interactively guide the user through configuration step-by-step via a wizard:

```
astp onboard
  ├─ 1. Select memory source scope (manual specification / automatic scan / skip)
  ├─ 2. Whether to use external memory components (Obsidian, Notion, etc., if available, integrate directly)
  ├─ 3. Confirm identity, tools, principles, etc. (default is full copy)
  └─ 4. Generate soul files and inject into target
```

**Default Behavior**: The following components are **copied in full** by default, without manual selection:
- Tool definitions and preferences (tools)
- Working principles (principles)
- Self-definition (identity/about_me)
- Scheduled task configuration (cron/schedules)

Components requiring user intervention to confirm are:
- Memory scope (which memories to migrate)
- Whether to connect to an external memory system (e.g., Obsidian)

---

## III. Project Structure

```
agent-soul-transfer/
├── src/
│   ├── main.ts                 # CLI entry point, registers all commands
│   ├── commands/               # CLI command implementations
│   │   ├── extract.ts          # astp extract — Extract soul from source platform
│   │   ├── inject.ts           # astp inject — Inject soul into target platform
│   │   ├── list.ts             # astp list — List available souls
│   │   ├── validate.ts         # astp validate — Validate soul files
│   │   ├── switch.ts           # astp switch — Quick switch of soul
│   │   ├── edit.ts             # astp edit — Interactive editing of soul
│   │   └── onboard.ts          # astp onboard — Configuration wizard (Mode 2)
│   ├── extractors/             | Logic for extracting souls from each platform
│   ├── injectors/              # Logic for injecting souls into each platform
│   ├── soul/                   # Soul data models, validation, serialization
│   ├── memory/                 # Memory management and selection logic
│   └── skills/                 # Skill management (registry, loaders)
├── skills-packages/            # Built-in skill pack repository
├── adapters/                   # Configuration metadata for each platform
├── schemas/                    # JSON Schema definitions
└── tests/                      # Tests
```

## IV. Technology Stack

- **TypeScript** + Node.js
- **commander.js** — CLI framework
- **inquirer.js** — Interactive prompts (used for the onboard wizard)
- **zod** — Runtime data validation
- **js-yaml** — YAML parsing/serialization
- **fs-extra** — File operations

## V. Soul File Format Example

The soul file is a YAML file (`soul.yaml`) with the following structure:

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
      content: "User prefers TypeScript over JavaScript"
      category: "preference"
      weight: 0.9

agent_config:
  opencode:
    system_prompt_append: "..."
  claude_code:
    system_prompt_append: "..."
```

## VI. Development Plan Overview

The current phase is planning two working modes (Agent Self-Packaging + Configuration Wizard onboard). The detailed specification development for the Skills Package Schema has been deprioritized; subsequently, we plan to use an internal skill database directly.