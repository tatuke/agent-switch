# ASTP Project Rules

Cross-agent project rules for this repository. EVERY AI agent working here (Claude Code, opencode, codex, openclaw, ...) MUST follow this file.

Platform-specific notes live in the corresponding agent file (e.g., `CLAUDE.md`) and MUST reference — never duplicate — the rules below. Claude Code reads `AGENTS.md` natively, so `AGENTS.md` is the single canonical source.

## Security Red Line (HIGHEST PRIORITY)

- **NEVER put real infrastructure info in any file that could be committed to git.** This includes:
  - Real internal IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  - Real usernames
  - Real hostnames, real email addresses, real ports, real internal paths
- ALWAYS use generic example values: `user@source-host`, `alice@10.0.0.5`, `/path/to/bundle`
- Applies to ALL files: README, INTRODUCE.md, config examples, test fixtures, comments, documentation
- Self-check BEFORE every file write. Violation = critical error. No exceptions.
- NEVER commit real secrets, API keys, tokens, or private keys. Use references or placeholder values.

## Language

- Documentation is English-first: `README.md`, `packys_en.md`, `adaptys_en.md` are the canonical specs.
- `README.zh.md` is the Simplified Chinese mirror — update it in the same commit when the English README changes.
- Code, identifiers, comments, commit messages: English.

## Build & Test

- Node.js >= 20, TypeScript. Commands: `npm run build` / `test` / `typecheck` / `lint`.
- Run `npm run typecheck` and `npm run test` before every commit. Do not commit with failing checks.
- Tests use vitest; fixtures must follow the Security Red Line (generic values only).

## Protocol Docs

- `packys_en.md` (packing spec) and `adaptys_en.md` (adapting spec) define the bundle format.
- Any change to the bundle structure MUST update both specs in the same commit so the two sides stay consistent.
- The bundle manifest version (`manifest.yaml` → `bundle_version`) must be bumped on any structural change.

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Commit author for this repository: `tatuke`. Confirm `git config user.name` before committing.
- Do not push without an explicit user request.
