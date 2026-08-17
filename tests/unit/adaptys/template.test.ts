import { describe, it, expect } from 'vitest';
import { injectPrecomputedBaseline } from '../../../src/adaptys/template.js';
import type { CompatibilityEntry } from '../../../src/soul/schema.js';

describe('injectPrecomputedBaseline', () => {
  it('should inject a compatibility matrix table into adaptys template', () => {
    const template = '## Step 0: Compatibility Self-Assessment\n\nPlease inventory your own capabilities.\n\n## Step 1';

    const matrix: Record<string, CompatibilityEntry> = {
      search: { match_level: 'full', suggested_mapping: 'Grep → grep', confidence: 'high' },
      execute: { match_level: 'partial', suggested_mapping: 'Bash → bash', confidence: 'medium', limitation: 'no workdir' },
      diagnostics: { match_level: 'gap', suggested_mapping: 'N/A', confidence: 'high', degradation: 'Use shell commands' },
    };

    const result = injectPrecomputedBaseline(template, 'opencode', 'claude-code', matrix);

    expect(result).toContain('Pre-computed Baseline (from source agent opencode)');
    expect(result).toContain('search');
    expect(result).toContain('full');
    expect(result).toContain('partial');
    expect(result).toContain('gap');
    expect(result).toContain('This is a suggested baseline');
  });

  it('should preserve rest of template unchanged', () => {
    const template = '## Step 0: Compatibility Self-Assessment\n\nOriginal text.\n\n## Step 1: Next step';
    const matrix: Record<string, CompatibilityEntry> = {};
    const result = injectPrecomputedBaseline(template, 'a', 'b', matrix);
    expect(result).toContain('## Step 1: Next step');
  });
});