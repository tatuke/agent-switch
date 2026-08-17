import { describe, it, expect } from 'vitest';
import { isSoulValid } from '@/soul/validator';

describe('soul validator', () => {
  it('returns true for valid soul', () => {
    const validSoul = {
      version: '2.0',
      metadata: {
        created: '2026-04-07T00:00:00Z',
        source_agent: 'opencode',
        target_compatibility: ['claude-code', 'openclaw'],
      },
      identity: {
        name: 'TestAgent',
        role: 'Developer',
        about_me: 'I am a test agent.',
      },
      skills_package: {
        packages: [],
      },
      tools_full_text: 'I use various tools.',
      principles_full_text: 'I follow best practices.',
      memories: {
        type: 'full',
        entries: [],
      },
      agent_config: {},
    };

    expect(isSoulValid(validSoul)).toBe(true);
  });

  it('returns false for wrong version', () => {
    const invalidSoul = {
      version: '1.0',
      metadata: {},
      identity: {},
      skills_package: { packages: [] },
      tools_full_text: '',
      principles_full_text: '',
      memories: { type: 'full', entries: [] },
      agent_config: {},
    };

    expect(isSoulValid(invalidSoul)).toBe(false);
  });

  it('returns false for missing required fields', () => {
    const incompleteSoul = {
      version: '2.0',
      metadata: {
        created: '2026-04-07T00:00:00Z',
        source_agent: 'opencode',
        target_compatibility: [],
      },
    };

    expect(isSoulValid(incompleteSoul)).toBe(false);
  });

  it('returns false for invalid memory entry weight', () => {
    const soulWithBadWeight = {
      version: '2.0',
      metadata: {
        created: '2026-04-07T00:00:00Z',
        source_agent: 'opencode',
        target_compatibility: [],
      },
      identity: {
        name: 'TestAgent',
        role: 'Developer',
        about_me: 'I am a test agent.',
      },
      skills_package: { packages: [] },
      tools_full_text: 'Tools text.',
      principles_full_text: 'Principles text.',
      memories: {
        type: 'full',
        entries: [
          {
            id: 'mem_001',
            content: 'Test memory',
            category: 'test',
            weight: 1.5,
            created: '2026-04-07T00:00:00Z',
          },
        ],
      },
      agent_config: {},
    };

    expect(isSoulValid(soulWithBadWeight)).toBe(false);
  });
});
