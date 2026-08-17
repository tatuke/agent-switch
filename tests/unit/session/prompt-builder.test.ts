import { describe, it, expect } from 'vitest';
import { buildPackPrompt, buildCliCommand } from '@/session/prompt-builder';
import type { Profile } from '@/soul/schema';

function makeProfile(overrides: Record<string, unknown>): Profile {
  return {
    agent: 'test',
    version_range: '0.x',
    capability_signatures: {},
    native_tools: [],
    rule_system: { type: 'single_file', format: 'markdown', global_file: '~/.test/rules.md', injection: 'append' },
    tool_permissions: { type: 'none', location: '', format: 'none' },
    hook_system: { type: 'none', entry: 'none' },
    security_boundaries: {},
    session_launch: { command: 'test-cli', pipe_mode: '-p', working_directory: '.', timeout_seconds: 600 },
    ...overrides,
  } as Profile;
}

describe('buildCliCommand', () => {
  it('builds -p pipe mode command', () => {
    const profile = makeProfile({ session_launch: { command: 'opencode', pipe_mode: '-p', working_directory: '.', timeout_seconds: 600 } });
    const cmd = buildCliCommand(profile, 'do something');
    expect(cmd).toBe("opencode -p 'do something'");
  });

  it('builds exec pipe mode command', () => {
    const profile = makeProfile({ session_launch: { command: 'codex', pipe_mode: 'exec', working_directory: '.', timeout_seconds: 600 } });
    const cmd = buildCliCommand(profile, 'do something');
    expect(cmd).toBe("codex exec 'do something'");
  });

  it('builds complex pipe mode with -m flag', () => {
    const profile = makeProfile({ session_launch: { command: 'openclaw', pipe_mode: 'agent -m', working_directory: '.', timeout_seconds: 600 } });
    const cmd = buildCliCommand(profile, 'do something');
    expect(cmd).toBe("openclaw agent -m 'do something'");
  });

  it('appends extra_args', () => {
    const profile = makeProfile({ session_launch: { command: 'openclaw', pipe_mode: 'agent -m', working_directory: '.', timeout_seconds: 600, extra_args: '--agent main --local' } });
    const cmd = buildCliCommand(profile, 'do something');
    expect(cmd).toBe("openclaw agent -m 'do something' --agent main --local");
  });

  it('escapes single quotes in prompt', () => {
    const profile = makeProfile({ session_launch: { command: 'opencode', pipe_mode: '-p', working_directory: '.', timeout_seconds: 600 } });
    const cmd = buildCliCommand(profile, "it's a test");
    expect(cmd).toContain("'\\''");
  });

  it('throws when command is null', () => {
    const profile = makeProfile({ session_launch: { command: null, pipe_mode: '-p', working_directory: '.', timeout_seconds: 600 } });
    expect(() => buildCliCommand(profile, 'test')).toThrow('no CLI command');
  });

  it('throws when pipe_mode is null', () => {
    const profile = makeProfile({ session_launch: { command: 'test', pipe_mode: null, working_directory: '.', timeout_seconds: 600 } });
    expect(() => buildCliCommand(profile, 'test')).toThrow('no pipe mode');
  });
});

describe('buildPackPrompt', () => {
  it('includes target agent name and session dir', () => {
    const source = makeProfile({ agent: 'opencode' });
    const target = makeProfile({ agent: 'claude-code' });
    const prompt = buildPackPrompt(source, target, '/tmp/astp-session');

    expect(prompt).toContain('claude-code');
    expect(prompt).toContain('/tmp/astp-session');
    expect(prompt).toContain('packys.md');
    expect(prompt).toContain('claude-code_profile.json');
  });

  it('includes absolute bundle output path when provided', () => {
    const source = makeProfile({ agent: 'opencode' });
    const target = makeProfile({ agent: 'claude-code' });
    const prompt = buildPackPrompt(source, target, '/tmp/astp-session', '/home/user/.astp-bundle');

    expect(prompt).toContain('/home/user/.astp-bundle');
  });

  it('uses default bundle path when not provided', () => {
    const source = makeProfile({ agent: 'opencode' });
    const target = makeProfile({ agent: 'claude-code' });
    const prompt = buildPackPrompt(source, target, '/tmp/astp-session');

    expect(prompt).toContain('.astp-bundle');
  });
});
