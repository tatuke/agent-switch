import { describe, it, expect } from 'vitest';
import { hasCliSession } from '@/adaptys/profile-loader';
import type { Profile } from '@/soul/schema';

function makeProfile(sessionLaunch: Record<string, unknown>): Profile {
  return {
    agent: 'test',
    version_range: '0.x',
    capability_signatures: {},
    native_tools: [],
    rule_system: { type: 'single_file', format: 'markdown', global_file: '~/.test/rules.md', injection: 'append' },
    tool_permissions: { type: 'none', location: '', format: 'none' },
    hook_system: { type: 'none', entry: 'none' },
    security_boundaries: {},
    session_launch: {
      command: null,
      pipe_mode: null,
      working_directory: '.',
      timeout_seconds: 600,
      ...sessionLaunch,
    },
  } as Profile;
}

describe('hasCliSession', () => {
  it('returns true when command is set', () => {
    const profile = makeProfile({ command: 'opencode', pipe_mode: '-p' });
    expect(hasCliSession(profile)).toBe(true);
  });

  it('returns true when only pipe_mode is set', () => {
    const profile = makeProfile({ command: null, pipe_mode: '-p' });
    expect(hasCliSession(profile)).toBe(true);
  });

  it('returns true when only extra_args is set', () => {
    const profile = makeProfile({ command: null, pipe_mode: null, extra_args: '--agent main' });
    expect(hasCliSession(profile)).toBe(true);
  });

  it('returns false when nothing is set', () => {
    const profile = makeProfile({});
    expect(hasCliSession(profile)).toBe(false);
  });

  it('returns true for hermes profile (command set, pipe_mode is -z)', () => {
    const profile = makeProfile({ command: 'hermes', pipe_mode: '-z' });
    expect(hasCliSession(profile)).toBe(true);
  });
});
