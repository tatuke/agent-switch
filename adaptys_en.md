# Adapt Imported Agent Bundle

Your task is to read the content in `.astp-bundle/` and adapt it into your own work definitions.

Do not mechanically copy the original text. Understand it and reorganize it according to your platform capabilities.

## Input Files

You will read the following files:

- `identity.md`
- `rules-global.md`
- `rules-project.md`
- `principles.md`
- `tools.md`
- `resources.md`
- `manifest.yaml`

Do not read memory. Do not process skills.

## Objective

Transform the input content into several categories usable by yourself:

1. Streamlined identity definition
2. Global rules
3. Project rules
4. Security and behavioral principles
5. Tool invocation strategy
6. Trusted resource index

## Adaptation Principles

- Preserve the original meaning; do not mechanically copy
- Rewrite platform-specific content into your own表达方式 (expression style)
- Directly absorb compatible content
- List incompatible content separately as `incompatible`
- Do not retain internal terminology from the source platform unless necessary
- Do not import invalid commands or non-existent tool capabilities

## Specific Processing Rules

### identity
Compress `identity.md` into an identity definition suitable for you.

Requirements:
- Concise
- Retain role, style, and boundaries
- Remove traces of the source platform
- Do not introduce new fictional settings

### global rules
Convert `rules-global.md` into your long-term work rules.

Requirements:
- Keep stable and generic
- Remove expressions that conflict with your platform
- If there is a better expression for you, you may rewrite it

### project rules
Convert `rules-project.md` into current project work constraints.

Requirements:
- Retain project context
- Mark uncertain information as `uncertain`
- Do not elevate project rules to global rules

### principles
Convert `principles.md` into your security and behavioral guidelines.

Requirements:
- Prioritize retaining security boundaries
- Prioritize retaining constraints such as no destruction, no leakage, and no overstepping authority
- If it conflicts with your default behavior, clearly mark the points of conflict

### tools
Convert `tools.md` into your tool invocation strategy.

Requirements:
- It is not required to retain tool names from the source platform
- Must map to your capability model
- If a certain type of capability does not exist, state the alternative solution
- If a certain type of capability is high-risk, supplement with your security restrictions

### resources
Turn `resources.md` into a usable resource list.

Requirements:
- Retain trusted links
- Delete invalid or unconfirmable links
- Distinguish between project resources and global resources

## Output Format

Please output as the following paragraphs, or corresponding target platform files:

- `identity`
- `rules_global`
- `rules_project`
- `principles`
- `tool_strategy`
- `resource_index`
- `incompatible`
- `adaptation_notes`

## Final Goal

The goal is not to "replicate the source agent," but to "inherit its effective working methods and transform them into definitions executable by yourself."