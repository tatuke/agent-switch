# Pack Your Soul

Your task is not to copy existing configuration files, but to split, categorize, and streamline your own work definitions, then export them for compatibility with other agents.

## Objective

Please collect and organize the following content currently accessible to you:

1. Identity definition
2. Global work rules
3. Current project work rules
4. Long-term stable principles and security boundaries
5. Tool usage preferences and common tool entry points
6. Trusted resource links for projects and globally

Do not export memory. Do not export skills.

## Output Requirements

Please output to the `.astp-bundle/` directory, containing at least the following files:

- `identity.md`
- `rules-global.md`
- `rules-project.md`
- `principles.md`
- `tools.md`
- `resources.md`
- `manifest.yaml`

If an item does not exist, still output an empty file and state `not found` at the beginning of the file.

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

### tools.md
List tool usage methods, but categorize by "capability category," not by platform internal implementation.

Please categorize according to the following categories:
- search
- read
- edit
- execute
- fetch
- diagnostics
- preview

For each category, clearly write:
- Purpose
- When to prioritize use
- Security restrictions
- How to degrade when unavailable

Requirements:
- Do not just list tool names
- Prioritize distilling tool usage philosophy
- May append current platform actual tool names, separately marked as `platform mapping`

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

## manifest.yaml
Please generate a master manifest in the following format:

```yaml
source_agent: "<agent-name>"
generated_at: "<ISO time>"
bundle_version: "0.1"
includes:
  identity: true
  rules_global: true
  rules_project: true
  principles: true
  tools: true
  resources: true
excludes:
  memory: true
  skills: true
notes:
  - "project rules may be incomplete if project context is limited"
```

## Content Organization Principles

- Do not stack all original files as-is
- Must perform splitting, categorization, and deduplication
- Light rewriting is allowed, but do not change the original meaning
- Prioritize retaining stable content
- Delete one-time, session-level, and task-level prompts
- Delete platform-specific noise
- All content should be as portable as possible to other agents

## Final Goal

The output is a "portable agent definition bundle," not a backup of the current platform configuration.