---
name: transport-skill
description: Guided transport configuration — step-by-step source/target setup for ASTP bundle transfer
origin: custom
stability: stable
cost_class: light
---

# Transport Skill — Guided Configuration

Use this skill when you need to configure and execute an ASTP bundle transfer between two agent platforms.

## Flow

### Step 1: Source Agent

Ask the user:
> "Which agent platform is the SOURCE for this transfer?"
> Options: opencode, claude-code, codex, gemini-cli, hermes, cursor, kiro, or custom name

Record the answer as `sourceAgent`.

### Step 2: Target Agent

Ask the user:
> "Which agent platform is the TARGET for this transfer?"
> Same options as Step 1.

Record as `targetAgent`.

Validate: source ≠ target (warn if same, ask user to confirm).

### Step 3: Source Endpoint

Ask the user:
> "Enter the source endpoint in user@host format (e.g., alice@203.0.113.5):"

Validate: must contain exactly one `@` separating user and host.

Ask: "Source SSH port? (default: 22)"

### Step 4: Source Pack Path

Ask the user:
> "Enter the path on the source host where the ASTP bundle is located (e.g., /home/alice/.astp-bundle/):"

Use your shell execution tool to check if the path exists (if source is local):
```bash
test -e <sourcePackPath> && echo "exists" || echo "not found"
```

If not found, warn the user and offer to retry.

### Step 5: Target Endpoint

Same as Step 3, for the target host.

### Step 6: Target Pack Path

Same as Step 4, for the target host.

### Step 7: Connectivity Test

Use your shell execution tool to verify connectivity:

For local hosts: skip SSH test.
For remote hosts:
```bash
ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p <port> <user@host> exit
```

If the test fails, classify the error:
- `Permission denied` → auth issue, suggest checking SSH keys
- `Could not resolve hostname` → DNS issue, suggest checking host/VPN
- `Connection timed out` → network issue, suggest checking firewall/VPN
- `Connection refused` → SSH not running, suggest checking remote service

Present results to the user. If blocking errors, offer: retry / save plan only / cancel.

### Step 8: Preview

Present a summary table to the user:

```
| Field         | Source                    | Target                    |
|---------------|---------------------------|---------------------------|
| Agent         | <sourceAgent>             | <targetAgent>             |
| Endpoint      | <sourceUser@Host>         | <targetUser@Host>         |
| SSH Port      | <sourcePort>              | <targetPort>              |
| Pack Path     | <sourcePackPath>          | <targetPackPath>          |
```

Ask: "Confirm? / Edit a field? / Cancel?"

If edit → loop back to the relevant step.
If cancel → exit.

### Step 8.5: Project Workspace Migration

Ask the user if they also want to migrate project-level context from the source workspace:

> "Do you also want to migrate project workspace context (AGENTS.md, .cursor/rules/, specs/, etc.) alongside the agent soul?"
> Options: Yes / No

If **No**, skip to Step 9.

If **Yes**, ask:
> "Enter the workspace root path on the source machine (e.g., /home/user/projects):"

Then ask:
> "Preferred code transfer method for projects?"
> Options:
> - Git link only — target clones from git remote (lightweight)
> - Zip transfer — compress and SCP project code
> - GitHub — push to GitHub, target clones from there

Record as `projectConfig`:
```yaml
enabled: true
workspace_root: "<path>"
preferred_method: "<git_link|zip|github>"
selected_projects: []
```

Note: The source agent will scan for projects at packing time and prompt for per-project transfer decisions. The `selected_projects` array being empty means "scan all".

### Step 9: Save Plan

Generate a transport plan YAML (version `"1.1"` if project migration is enabled, otherwise `"1.0"`):

```yaml
version: "1.1"
created_at: "<ISO timestamp>"
source:
  agent: "<sourceAgent>"
  userAtHost: "<sourceUserAtHost>"
  packPath: "<sourcePackPath>"
  port: <sourcePort>
target:
  agent: "<targetAgent>"
  userAtHost: "<targetUserAtHost>"
  packPath: "<targetPackPath>"
  port: <targetPort>
projects:
  enabled: true
  workspace_root: "<workspaceRoot>"
  preferred_method: "<git_link|zip|github>"
  selected_projects: []
validation:
  source: <check results or skipped: true>
  target: <check results or skipped: true>
```

Save to `~/.astp/transfers/<sourceAgent>-to-<targetAgent>-<timestamp>.yaml`.

### Step 10: Execute Transfer

Use scp or rsync to transfer the bundle:

```bash
scp -r -P <sourcePort> <sourceUserAtHost>:<sourcePackPath> <targetPackPath>
```

Or, if the user prefers to use the CLI tool:

```bash
astp transport --plan <plan-file-path>
```

Report transfer result to the user.

## Notes

- All steps allow the user to provide values via CLI flags (skipping the interactive step)
- The `--skip-check` flag skips connectivity testing
- The `--save-only` flag saves the plan without executing transfer
- Use your own tools for validation (shell execution for SSH, file tools for path checks)
- When in doubt about connectivity, ask the user — don't guess
- Project workspace migration (Step 8.5) produces `projects-manifest.yaml` and `project-context/` in the bundle
- The target agent should follow `adaptys_en.md` "Project Context Import" section to restore project context
