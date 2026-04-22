# Adapt Imported Agent Bundle v2

Your task is to read the content in `.astp-bundle/` and adapt it into your own work definitions.

Do not mechanically copy the original text. Understand it and reorganize it according to your platform capabilities.

## Input Files

You will read the following files:

- `identity.md`
- `rules-global.md`
- `rules-project.md`
- `principles.md`
- `tools.md` — abstract capability categories with signatures and adaptation guides (Layer 1)
- `tool-map.md` — concrete tool mappings with platform mapping hints (Layer 2)
- `security-patterns.md` — operational security patterns (Layer 3)
- `resources.md`
- `manifest.yaml`

Do not read memory. Do not process skills.

## Step 0: Compatibility Self-Assessment

Before adapting the bundle, inventory your own capabilities:

1. **List every tool you have access to** — names and what they do
2. **For each tool, determine its capability signature** — what input it takes, what output it produces, what constraints it has
3. **Read `tools.md`** — extract the capability signatures from each category
4. **Compare your signatures against the bundle's signatures** — determine match level for each category:
   - **Full match**: Your tool's input/output/constraints align with the bundle's signature
   - **Partial match**: Core function works, but constraints differ (e.g., no regex in your search tool)
   - **Gap**: No tool provides this function on your platform
5. **Produce a compatibility matrix**:

```markdown
## Compatibility Matrix

| Bundle Capability | Bundle Signature | Your Equivalent Tool | Match Level | Notes |
|---|---|---|---|---|
| search | { input: query_string, output: [file+line], constraints: regex } | Grep | full | Direct mapping |
| read | { input: file_path | url, output: content, constraints: offset } | Read | full | Supports offset/limit |
| edit | { input: file+old+new, output: modified, constraints: exact } | Edit | full | Exact string replace |
| execute | { input: command, output: stdout+stderr+exit, constraints: timeout } | Bash | partial | No timeout config |
| fetch | { input: url, output: markdown, constraints: format } | WebFetch | partial | No format selection |
| diagnostics | { input: query, output: report, constraints: real_time } | None | gap | No diagnostics tool |
| preview | { input: changes, output: diff, constraints: side_by_side } | None | gap | No preview tool |
```

This matrix drives ALL subsequent adaptation decisions. Do NOT skip this step.

## Core Principle: Compatibility First

**Your goal is not to replace your existing definitions — it is to enrich them.**

When incoming content **conflicts** with your current definitions (identity, rules, principles, tool strategies), **do not silently overwrite**. Instead:

1. **Identify the conflict clearly** — what does the source say vs. what you currently do
2. **Present the user with options** — let them decide which behavior to keep
3. **Default to the safer/stricter option** when user input is not available
4. **Never degrade your existing security boundaries** — only strengthen or preserve them

## Objective

Transform the input content into several categories usable by yourself:

1. Streamlined identity definition
2. Global rules
3. Project rules
4. Security and behavioral principles
5. Tool invocation strategy (merged via progressive injection)
6. Trusted resource index
7. Compatibility matrix (from Step 0)
8. Conflict report — what conflicts exist and what the user should decide
9. Platform interop notes — behavioral translation notes
10. Capability gaps — what you cannot replicate

## Progressive Three-Layer Injection Strategy

Each layer from the bundle has a different merge strategy:

| Layer | Source File | Merge Strategy | Why |
|---|---|---|---|
| 1 — Abstract | `tools.md` | **Direct merge** | Capability philosophy and adaptation guides are universal; any agent can adopt them |
| 2 — Concrete | `tool-map.md` | **Self-map then merge** | Concrete mappings must be translated to your platform's tools using your compatibility matrix |
| 3 — Security | `security-patterns.md` | **Evaluate then merge** | Security patterns must be assessed against your existing boundaries; only adopt if it strengthens or preserves |

### Layer 1: Direct Merge (tools.md)

The capability philosophy, signatures, and adaptation guides in `tools.md` are universal. Adopt them wholesale:

- **Capability categories** → adopt as your tool strategy framework
- **Capability signatures** → adopt as your tool capability descriptors
- **Adaptation guides** → keep for reference (they describe how to handle gaps)
- **Degradation paths** → adopt as your fallback strategies

Do NOT change the philosophy or signatures — they are platform-agnostic by design.

### Layer 2: Self-Map Then Merge (tool-map.md)

For each entry in `tool-map.md`:

1. **Read the capability category and Platform Mapping Hint**
2. **Look up your compatibility matrix** — find the match level for this capability
3. **If full match**: Replace the source tool name with YOUR tool name, keep config source and auth reference if they're still valid on your platform
4. **If partial match**: Replace tool name, document the limitation in adaptation_notes
5. **If gap**: Mark as `unavailable` in your tool strategy, follow the degradation decision tree below
6. **If config source/auth reference is platform-independent** (e.g., a URL, an env var name): preserve it
7. **If config source/auth reference is source-platform-specific**: note as `source_specific_config` and try to find your equivalent

### Layer 3: Evaluate Then Merge (security-patterns.md)

For each security pattern:

1. **Read the pattern (What / Why / How)**
2. **Does your platform have an equivalent mechanism?**
   - Yes → adopt the pattern, map to your implementation, note the mapping
   - No equivalent mechanism → mark as `dependency_gap` — you need to set up this infrastructure
   - Conflicts with your default behavior → present to the user (see conflict protocol below)
3. **Security can only be strengthened, never weakened** — always adopt stricter rules

## Degradation Decision Tree

When a capability gap is identified from your compatibility matrix:

```
Capability gap detected
  ├── Can I achieve the same result with a different approach?
  │   ├── Yes → Adopt alternative approach, document the mapping in adaptation_notes
  │   └── No → Continue below
  ├── Can I achieve a partial result?
  │   ├── Yes → Adopt partial approach, document the limitation in capability_gaps
  │   └── No → Continue below
  ├── Is this capability critical for the bundle's intended workflow?
  │   ├── Yes → Mark as "critical_gap", ask user for guidance
  │   └── No → Mark as "non_critical_gap", note in adaptation_notes
  └── Is there an external tool/service I could integrate?
      ├── Yes → Suggest integration, document dependency in capability_gaps
      └── No → Mark as "unavailable", include in capability_gaps output
```

## Adaptation Principles

- Preserve the original meaning; do not mechanically copy
- Rewrite platform-specific content into your own expression style
- Directly absorb compatible content
- List incompatible content separately as `incompatible`
- Do not retain internal terminology from the source platform unless necessary
- Do not import invalid commands or non-existent tool capabilities
- **Use capability signatures for matching, not tool names**
- **Follow the progressive injection strategy for each layer**
- **When in doubt, ask the user — do not guess**

## Specific Processing Rules

### identity
Read `identity.md` and compare with your current identity definition.

- If compatible → merge insights that enrich your current identity
- If conflicting → present the differences to the user and ask which to adopt
- Never silently replace your entire identity with the source's

### global rules
Read `rules-global.md` and compare with your current global rules.

- If the source rule adds something new → adopt it
- If the source rule conflicts with an existing rule → present both to the user:
  ```
  ⚠️ Rule conflict detected:
  - Current: <your current rule>
  - Imported: <source rule>
  Which would you like to keep? [1] Current  [2] Imported  [3] Merge both
  ```
- If the source rule is a subset of your existing rule → keep yours

### project rules
Read `rules-project.md` and compare with your current project rules.

- Retain project context from the source
- Mark uncertain information as `uncertain`
- Do not elevate project rules to global rules
- If the project is different from your current projects → add as a new project section, do not overwrite

### principles
Read `principles.md` and compare with your current principles.

- If the source principle is stricter than yours → adopt it (security can only improve)
- If the source principle is weaker than yours → keep yours, note the downgrade as `source has weaker rule`
- If conflicting → present to the user with the same option format as rules
- If it conflicts with your default behavior → clearly mark the points of conflict and ask the user

### tool_strategy (Progressive Injection)

**Layer 1 (tools.md): Direct merge** — adopt capability categories, signatures, and adaptation guides wholesale.

**Layer 2 (tool-map.md): Self-map then merge** — for each entry:
- If your platform has an **equivalent tool** (from compatibility matrix "full") → map to it and note the mapping
- If your platform has a **partial equivalent** (from matrix "partial") → note the gap
- If your platform has **no equivalent** (from matrix "gap") → mark as `unavailable` and follow degradation decision tree
- Preserve resource references (URLs, file paths, env var names) where applicable — these may still be valid on your platform
- Use **Platform Mapping Hints** from the bundle to identify what kind of tool to look for on your platform

**Layer 3 (security-patterns.md): Evaluate then merge** — for each pattern:
- If your platform has an **equivalent mechanism** → adopt it and map to your implementation
- If your platform has **no equivalent mechanism** → mark as `dependency_gap`
- If the pattern **conflicts with your default behavior** → present to the user

If the source tool strategy **conflicts** with your current tool strategy (e.g., different preferred tool, different security restrictions):
```
⚠️ Tool strategy conflict detected for <capability>:
- Current: <your current approach>
- Imported: <source approach>
Which would you like to use? [1] Current  [2] Imported  [3] Use both (context-dependent)
```

### resources
Turn `resources.md` into a usable resource list.

- Retain trusted links
- Delete invalid or unconfirmable links
- Distinguish between project resources and global resources
- Preserve internal service addresses (APIs, dashboards) — these are often still valid within the same network
- If resources belong to a project you don't have → list them separately under `external_resources`

## Output Format

Please output as the following sections, or corresponding target platform files:

- `identity` — adapted identity definition (or conflict report if conflicting)
- `rules_global` — adapted global rules (with conflict resolutions noted)
- `rules_project` — adapted project rules
- `principles` — adapted security and behavioral principles
- `tool_strategy` — merged tool strategy using progressive injection (Layer 1 direct + Layer 2 self-mapped + Layer 3 evaluated)
- `resource_index` — adapted trusted resource list
- `security_patterns` — adopted security patterns with boundary assessment
- `compatibility_matrix` — the self-assessment matrix from Step 0
- `incompatible` — items from the bundle that cannot be adapted to your platform
- `adaptation_notes` — summary of what was adapted, what was changed, and why
- `capability_gaps` — capabilities from the source agent that you cannot replicate, with degradation paths
- `conflict_report` — all detected conflicts with user-selectable options
- **`platform_interop_notes`** — behavioral translation notes between platforms

## Platform Interop Notes

Document behavioral differences that are not conflicts but are translation concerns:

- **Hook/Event system differences** — some platforms use phase-based hooks, others use event-based hooks; note the translation needed
- **Model naming differences** — some platforms use shorthand (opus, sonnet), others use full provider names (anthropic/claude-opus-4-5); note the expansion needed
- **Rule injection differences** — some platforms use single-file rules (CLAUDE.md, AGENTS.md), others use directory-based rules (.cursor/rules/, .kiro/steering/); note the consolidation/splitting needed
- **Tool permission differences** — some platforms use boolean maps, others use allow/deny lists; note the format conversion needed

For each note:
- **What differs** — the behavioral difference
- **Why it matters** — what could go wrong if not translated
- **How to translate** — the conversion needed

## Conflict Report Format

When conflicts are detected, present them in this format:

```markdown
## Conflict Report

### #1: <Category> — <Brief description>
- **Source:** <what the bundle says>
- **Current:** <what you currently do>
- **Impact:** <what happens if you switch / don't switch>
- **Recommendation:** <your recommendation and why>
- **User options:**
  - [A] Keep current behavior
  - [B] Adopt source behavior
  - [C] Merge (describe how)
  - [D] Defer — ask me later
```

## Final Goal

The goal is not to "replicate the source agent," but to "inherit its effective working methods and transform them into definitions executable by yourself."

Use capability signatures for matching — not tool names. Follow progressive injection for each layer — not one-size-fits-all merge. When in conflict: present options, let the user decide. Never silently overwrite your own definitions.

Preserve all concrete configuration (URLs, endpoints, file paths, credential references) — these are often platform-independent. Adapt only the tool invocation mechanics.

**Translation, not replacement. Self-mapping, not name-matching. Progressive injection, not wholesale copy.**