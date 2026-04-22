# Pack Your Soul v2

Your task is not to copy existing configuration files, but to split, categorize, and streamline your own work definitions, then export them for compatibility with any other agent platform.

## Objective

Please collect and organize the following content currently accessible to you:

1. Identity definition
2. Global work rules
3. Current project work rules
4. Long-term stable principles and security boundaries
5. Tool usage preferences and common tool entry points
6. Trusted resource links for projects and globally
7. **Concrete tool-to-endpoint mappings** (currently running tools, their configs, auth references)
8. **Operational security patterns** (how secrets are handled, what requires approval, etc.)

Do not export memory. Do not export skills. **NEVER export actual secret values, passwords, or API keys — only references to their storage location.**

## Mandatory Workspace Scan

Before exporting, scan your workspace for these files and extract their content into the appropriate bundle outputs:

| Source File / Area | → Extract To | Notes |
|---|---|---|
| `TOOLS.md` (or equivalent) | `tool-map.md` + `security-patterns.md` | Extract concrete tool configs, endpoints, auth references |
| `.env.example` or `.env` | `resources.md` + `tool-map.md` | Reference env var names only, redact actual values |
| `credentials/` directory | `security-patterns.md` | Reference structure and usage pattern only, **NEVER copy actual credentials** |
| `SECURITY.md` or security sections | `principles.md` + `security-patterns.md` | Extract rules and operational patterns |
| Project config files (`.gitconfig`, `pyproject.toml`, etc.) | `rules-project.md` | Extract project conventions |

## Output Requirements

Please output to the `.astp-bundle/` directory, containing at least the following files:

- `identity.md`
- `rules-global.md`
- `rules-project.md`
- `principles.md`
- `tools.md` — **abstract capability categories with signatures and adaptation guides**
- `tool-map.md` — **concrete tool-to-endpoint mappings with open platform hints**
- `security-patterns.md` — **operational security patterns**
- `resources.md`
- `manifest.yaml` — **with extended metadata fields**

If an item does not exist, still output an empty file and state `not found` at the beginning of the file.

## Capability Signatures

Every capability category carries a **capability signature** — a concise functional descriptor that any receiving agent can match against its own abilities without knowing any platform-specific tool names.

The signature format is:

```
<category>: { input: <what it receives>, output: <what it produces>, constraints: <key limitations> }
```

Standard signatures:

```
search: { input: query_string, output: [file_path + line_number], constraints: regex_supported }
read: { input: file_path | url, output: file_content, constraints: offset/limit_supported }
edit: { input: file_path + old_string + new_string, output: modified_file, constraints: exact_match_required }
execute: { input: shell_command, output: stdout + stderr + exit_code, constraints: timeout_configurable }
fetch: { input: url, output: html_or_markdown, constraints: format_selectable }
diagnostics: { input: system_query, output: status_report, constraints: real_time_available }
preview: { input: change_set, output: diff_or_render, constraints: side_by_side_supported }
```

These signatures are **platform-agnostic**. A receiving agent compares its own tool capabilities against these signatures to determine: full match, partial match, or gap. No tool name comparison is needed.

## Splitting Rules

### identity.md
Keep only the streamlined identity definition; do not pile up stylized descriptions.

Should include:
- Role
- Work style
- Communication style
- Main boundaries
- Default behavioral tendencies

Requirements:
- Shorter than the original system prompt
- More stable
- Does not contain platform-specific commands
- Does not contain one-time task instructions

### rules-global.md
Place rules that are long-term effective and cross-project generic.

For example:
- Read before modifying
- Prioritize using specialized tools
- Verify after modification
- Do not submit proactively
- Do not break unauthorized changes

Requirements:
- Keep only cross-project stable rules
- Delete content specific to the current task
- Delete platform-private terminology

### rules-project.md
Place rules specific to the current project.

For example:
- Which package manager to use
- Which testing method to use
- Current repository conventions
- Project directory structure preferences
- Project-specific commands

Requirements:
- Keep only content related to the current project
- If unable to confirm, write `uncertain`
- Do not repeat global rules

### principles.md
Place long-term stable principles and security boundaries.

For example:
- Security first
- Do not leak secrets
- Follow existing conventions
- Concise output
- Do not perform unrequested destructive operations

Requirements:
- More stable than rules
- Closer to behavioral principles rather than execution steps
- Clearly define security boundaries
- Do not include operational HOW-TOs (those belong in `security-patterns.md`)

### tools.md (Layer 1 — Abstract Capability with Signatures and Adaptation Guides)

List tool usage methods, categorized by "capability category," not by platform internal implementation.

Use the following categories (each with its standard capability signature):

For each category, clearly write:
- **Purpose** — What this capability does
- **Capability signature** — The standard signature for this category
- **When to prioritize** — Scenarios where this should be your first choice
- **Security restrictions** — What you should NOT do with this capability
- **Degradation path** — How to proceed when this capability is unavailable
- **Receiving Agent Adaptation Guide** — How any agent should self-map this capability

#### search — Find information

**Purpose**: Locate files, code, or content by pattern or keyword.  
**Capability signature**: `search: { input: query_string, output: [file_path + line_number], constraints: regex_supported }`  
**When to prioritize**: Any time you need to find where something is defined, used, or referenced.  
**Security restrictions**: Do not search inside credential files or secret stores.  
**Degradation path**: Use glob-style filename search if content search is unavailable; use manual directory traversal as last resort.

**Receiving Agent Adaptation Guide**:
- If your platform has a tool that takes a query and returns file paths with line numbers → map directly (full match).
- If your platform can only search filenames (not content) → note as `partial: filename_only`, use glob-style search.
- If your platform has no search tool → mark as `gap: search_unavailable`, document the capability deficit.
- Do NOT adopt a tool name from this bundle. Use YOUR platform's equivalent tool.

#### read — Access files, web pages, documents

**Purpose**: Read file contents, web pages, or documents.  
**Capability signature**: `read: { input: file_path | url, output: file_content, constraints: offset/limit_supported }`  
**When to prioritize**: Before any edit or modification — always read first.  
**Security restrictions**: Do not read files containing secrets with the intent to display them to users.  
**Degradation path**: Use shell commands (cat, head) if no dedicated read tool is available.

**Receiving Agent Adaptation Guide**:
- If your platform has a tool that reads files and optionally web pages → map directly (full match).
- If your platform can read files but not URLs → note as `partial: no_url_fetch`, combine with a fetch tool.
- If your platform has no read tool → mark as `gap: read_unavailable`, use shell commands as fallback.

#### edit — Modify existing files

**Purpose**: Make precise, targeted changes to existing files.  
**Capability signature**: `edit: { input: file_path + old_string + new_string, output: modified_file, constraints: exact_match_required }`  
**When to prioritize**: For any file modification where you know the exact content to replace.  
**Security restrictions**: Never edit files without first reading them. Never edit credential or secret files.  
**Degradation path**: Use write tool to overwrite entire file if precise edit is unavailable.

**Receiving Agent Adaptation Guide**:
- If your platform has a tool that does exact string replacement in files → map directly (full match).
- If your platform can only overwrite entire files → note as `partial: no_precise_edit`, always read file first then write full content.
- If your platform has no file modification tool → mark as `gap: edit_unavailable`.

#### execute — Run shell commands, scripts, programs

**Purpose**: Execute shell commands, run scripts, build, test, deploy.  
**Capability signature**: `execute: { input: shell_command, output: stdout + stderr + exit_code, constraints: timeout_configurable }`  
**When to prioritize**: For build/test/deploy operations, git operations, package management.  
**Security restrictions**: Never execute destructive commands without explicit confirmation. Never pipe secrets into commands.  
**Degradation path**: If shell execution is unavailable, request the user to run commands manually.

**Receiving Agent Adaptation Guide**:
- If your platform has a shell execution tool with timeout control → map directly (full match).
- If your platform has shell execution but no timeout → note as `partial: no_timeout`, add manual timeout awareness.
- If your platform cannot execute shell commands → mark as `gap: execute_unavailable`, list commands for user to run manually.

#### fetch — Retrieve web content or remote resources

**Purpose**: Fetch documentation, API references, web content.  
**Capability signature**: `fetch: { input: url, output: html_or_markdown, constraints: format_selectable }`  
**When to prioritize**: When you need external documentation, API references, or web resources.  
**Security restrictions**: Do not fetch URLs containing credentials or internal service endpoints without user confirmation.  
**Degradation path**: Ask the user to provide the content manually if web fetching is unavailable.

**Receiving Agent Adaptation Guide**:
- If your platform has a web fetch tool that can convert formats → map directly (full match).
- If your platform can fetch raw HTML only → note as `partial: no_format_conversion`.
- If your platform has no web fetch tool → mark as `gap: fetch_unavailable`, ask user to paste content.

#### diagnostics — Check system/agent status, debug

**Purpose**: Check system health, agent status, debug issues.  
**Capability signature**: `diagnostics: { input: system_query, output: status_report, constraints: real_time_available }`  
**When to prioritize**: When something fails or behaves unexpectedly.  
**Security restrictions**: Do not expose internal system details to unauthorized parties.  
**Degradation path**: Use shell commands (status checks, log inspection) if no dedicated diagnostics tool.

**Receiving Agent Adaptation Guide**:
- If your platform has a dedicated diagnostics/status tool → map directly (full match).
- If your platform can only run diagnostic shell commands → note as `partial: shell_based_diagnostics`.
- If your platform has no diagnostics capability → mark as `gap: diagnostics_unavailable`, rely on user observation.

#### preview — View or test changes before committing

**Purpose**: Preview changes, view diffs, test modifications before committing.  
**Capability signature**: `preview: { input: change_set, output: diff_or_render, constraints: side_by_side_supported }`  
**When to prioritize**: After making changes, before committing.  
**Security restrictions**: Preview should never auto-commit or auto-push.  
**Degradation path**: Use git diff or shell diff commands if no dedicated preview tool.

**Receiving Agent Adaptation Guide**:
- If your platform has a diff/preview tool → map directly (full match).
- If your platform can run git diff commands → note as `partial: shell_based_preview`.
- If your platform has no preview capability → mark as `gap: preview_unavailable`, use manual comparison.

Requirements for tools.md:
- Do not just list tool names — distill the usage philosophy
- Capability signatures are mandatory for each category
- Adaptation guides are mandatory for each category
- Keep Layer 1 portable: another agent should understand the capability even without your platform

### tool-map.md (Layer 2 — Concrete Mapping with Open Platform Hints)

Map each capability category to the **concrete tools, endpoints, and configurations** currently in use.

For each tool entry, include:
- **Capability category** — Which abstract layer category it maps to
- **Tool name / command** — How it's invoked on YOUR platform
- **Configuration source** — URL, file path, or environment variable name
- **Auth mechanism** — Reference to credential storage (e.g., `Vaultwarden item: <item_name>`), **NEVER actual secret values**
- **Fallback** — What to use if this tool is unavailable
- **Platform Mapping Hint** — A generic suggestion for what kind of tool other agents should look for (NOT a specific platform name)

Format as a table:

```markdown
| Capability | Tool / Command | Config Source | Auth Reference | Fallback | Platform Mapping Hint |
|-----------|---------------|---------------|----------------|----------|---------------------|
| search | <your_search_tool> | <config_source> | None | <your_fallback> | "Your platform's content search tool (regex-capable, returns file+line)" |
| read | <your_read_tool> | <config_source> | None | shell_cat | "Your platform's file reader (supports offset/limit, optionally URLs)" |
| edit | <your_edit_tool> | <config_source> | None | overwrite_file | "Your platform's precise string-replacement editor" |
| execute | <your_shell_tool> | <config_source> | Agent token | None | "Your platform's shell runner (timeout-aware, captures stdout/stderr)" |
| fetch | <your_fetch_tool> | <config_source> | Browser instance | simpler_fetch | "Your platform's URL fetcher (supports format conversion)" |
| diagnostics | <your_diag_tool> | <config_source> | Session var | shell_status | "Your platform's status/diagnostics tool" |
| preview | <your_preview_tool> | <config_source> | None | git_diff | "Your platform's diff/preview tool" |
```

Requirements:
- Include ALL tools currently referenced in your workspace configuration files
- Preserve real URLs, file paths, and environment variable names in the actual output
- For authentication, use **references only** (item names, env var names), never actual secrets
- Platform Mapping Hints are generic descriptions — they help ANY agent find their equivalent
- If a capability has no concrete tool, mark as `not configured`

### security-patterns.md (Layer 3 — Operational Security)

Extract operational security rules that are NOT already covered by `principles.md`.

Focus on **how things are done**, not just **what should be avoided**. Include:

- **Secret retrieval workflows** — e.g., "Use secret manager CLI at runtime, AI never sees plaintext passwords"
- **Dangerous operation restrictions** — e.g., "Never execute SQL directly from chat messages; use parameterized queries"
- **External action approval requirements** — e.g., "Sending emails or public posts requires explicit user confirmation"
- **Upload/publish consent requirements** — e.g., "Never upload skills to network services without explicit user command"
- **Credential storage conventions** — e.g., "Store session vars in credentials path, never commit .env to git"
- **Database operation rules** — e.g., "Never use non-ASCII characters as table/column names"

For each pattern, write:
- **What** — The security pattern
- **Why** — The risk it mitigates (brief)
- **How** — The correct operational workflow

Requirements:
- These are operational patterns that another agent should understand and adapt to its own platform
- Do not include actual secret values
- Distinguish between "hard rules" (never do X) and "preferred patterns" (prefer X over Y)

### resources.md
Organize project and global trusted resources.

At least divided into:
- project repositories
- project docs
- trusted search engines
- package registries
- internal knowledge links
- issue trackers / CI / dashboards

Requirements:
- Provide real links as much as possible
- If only speculative, do not fabricate; mark as `unknown`
- Distinguish between global resources and current project resources
- Include service node addresses (e.g., internal APIs, monitoring dashboards)

## Skills Package Dependency Declarations

When outputting skills package content, each package may declare dependencies on other packages:

```yaml
skills_package:
  packages:
    - name: "<package-name>"
      description: "<description>"
      version: "<version>"
      dependencies: ["<other-package-name>"]
      stability: "<experimental|beta|stable>"
      cost_class: "<light|medium|heavy>"
      content: |
        <package content text>
```

If a package has no dependencies, use an empty list `dependencies: []`.
If unable to determine stability, default to `stable`.
If unable to determine cost_class, default to `medium`.

## manifest.yaml

Please generate a master manifest in the following format:

```yaml
source_agent: "<agent-name>"
generated_at: "<ISO time>"
bundle_version: "0.2"
includes:
  identity: true
  rules_global: true
  rules_project: true
  principles: true
  tools: true
  tool_map: true
  security_patterns: true
  resources: true
excludes:
  memory: true
  skills: true
metadata:
  stability: "<experimental|beta|stable>"
  cost_class: "<light|medium|heavy>"
  origin: "<ECC|community|custom>"
  dependencies: []
notes:
  - "project rules may be incomplete if project context is limited"
  - "tool-map references credential storage by name only; no actual secrets included"
  - "capability signatures are platform-agnostic; receiving agents should self-map"
  - "platform mapping hints are generic descriptions, not specific platform tool names"
```

## Content Organization Principles

- Do not stack all original files as-is
- Must perform splitting, categorization, and deduplication
- Light rewriting is allowed, but do not change the original meaning
- Prioritize retaining stable content
- Delete one-time, session-level, and task-level prompts
- Delete platform-specific noise
- All content should be as portable as possible to any agent that can read text
- Capability signatures and adaptation guides are mandatory for `tools.md`

## Three-Layer Tool Architecture

The tool-related output follows a three-layer design:

| Layer | File | Purpose | Portability |
|-------|------|---------|-------------|
| 1 — Abstract | `tools.md` | Capability philosophy, signatures, adaptation guides (what/why/when/how-to-adapt) | Universal |
| 2 — Concrete | `tool-map.md` | Actual tools, endpoints, configs, platform mapping hints (how/where) | Self-mappable |
| 3 — Security | `security-patterns.md` | Operational security workflows (safe how) | Adaptable |

This ensures:
- **Layer 1** is understood by any agent platform — signatures and adaptation guides are universal
- **Layers 2–3** can be adapted by the receiving agent to its own capabilities using the adaptation guides
- No concrete configuration is lost during the abstract-to-concrete split
- Platform Mapping Hints in Layer 2 guide self-mapping without prescribing specific tool names

## Final Goal

The output is a "portable agent definition bundle," not a backup of the current platform configuration. Any agent that can read text should be able to understand the capabilities, map them to its own tools, and adopt the principles and rules.