import { describe, it, expect } from 'vitest';
import { computeCompatibilityMatrix } from '@/adaptys/matrix';
import type { Profile, CapabilitySignature } from '@/soul/schema';

function makeSig(input: string, output: string, constraints: string[]): CapabilitySignature {
  return { input, output, constraints };
}

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    agent: 'test',
    version_range: '0.x',
    capability_signatures: {},
    native_tools: [],
    rule_system: { type: 'single_file', format: 'markdown', global_file: '~/.test/rules.md', injection: 'append' },
    tool_permissions: { type: 'none', location: '', format: 'none' },
    hook_system: { type: 'none', entry: 'none' },
    security_boundaries: {},
    session_launch: { command: 'test', pipe_mode: '-p', working_directory: '.', timeout_seconds: 600 },
    ...overrides,
  } as Profile;
}

describe('computeCompatibilityMatrix', () => {
  it('returns full match when signatures are identical', () => {
    const sig = makeSig('query_string', '[file+line]', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sig } });
    const target = makeProfile({ capability_signatures: { search: sig } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.match_level).toBe('full');
    expect(matrix.search.confidence).toBe('high');
  });

  it('returns partial match when target lacks constraints', () => {
    const sourceSig = makeSig('query_string', '[file+line]', ['regex', 'path_filter']);
    const targetSig = makeSig('query_string', '[file+line]', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sourceSig } });
    const target = makeProfile({ capability_signatures: { search: targetSig } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.match_level).toBe('partial');
    expect(matrix.search.confidence).toBe('medium');
  });

  it('returns partial match when input/output differs', () => {
    const sourceSig = makeSig('query_string', '[file+line]', ['regex']);
    const targetSig = makeSig('text', 'results', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sourceSig } });
    const target = makeProfile({ capability_signatures: { search: targetSig } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.match_level).toBe('partial');
  });

  it('returns gap when target signature is null', () => {
    const sourceSig = makeSig('query_string', '[file+line]', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sourceSig } });
    const target = makeProfile({ capability_signatures: { search: null } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.match_level).toBe('gap');
    expect(matrix.search.confidence).toBe('high');
  });

  it('returns unknown when target has no such capability', () => {
    const sourceSig = makeSig('query_string', '[file+line]', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sourceSig } });
    const target = makeProfile({ capability_signatures: {} });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.match_level).toBe('unknown');
    expect(matrix.search.confidence).toBe('low');
  });

  it('skips null source signatures', () => {
    const source = makeProfile({ capability_signatures: { search: null } });
    const target = makeProfile({ capability_signatures: { search: null } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search).toBeUndefined();
  });

  it('provides degradation suggestion for gaps', () => {
    const sourceSig = makeSig('query_string', '[file+line]', ['regex']);
    const source = makeProfile({ capability_signatures: { search: sourceSig } });
    const target = makeProfile({ capability_signatures: { search: null } });

    const matrix = computeCompatibilityMatrix(source, target);
    expect(matrix.search.degradation).toContain('glob search');
  });
});
