import { describe, it, expect } from 'vitest';
import {
  StabilityEnum,
  CostClassEnum,
  OriginEnum,
  SkillsPackageEntrySchema,
  BundleMetadataSchema,
  SoulSchema,
} from '@/soul/schema';

describe('schema extensions', () => {
  it('SkillsPackageEntrySchema accepts new metadata fields', () => {
    const entry = SkillsPackageEntrySchema.parse({
      name: 'django-tdd',
      description: 'Django TDD workflow',
      version: '1.0',
      content: 'Content text.',
      dependencies: ['django-patterns'],
      stability: 'beta',
      cost_class: 'light',
      origin: 'community',
    });

    expect(entry.dependencies).toEqual(['django-patterns']);
    expect(entry.stability).toBe('beta');
    expect(entry.cost_class).toBe('light');
    expect(entry.origin).toBe('community');
  });

  it('SkillsPackageEntrySchema defaults metadata fields', () => {
    const entry = SkillsPackageEntrySchema.parse({
      name: 'basic-package',
      description: 'Basic package',
      version: '1.0',
      content: 'Content.',
    });

    expect(entry.dependencies).toEqual([]);
    expect(entry.stability).toBe('stable');
    expect(entry.cost_class).toBe('medium');
    expect(entry.origin).toBe('custom');
  });

  it('SkillsPackageEntrySchema rejects invalid stability', () => {
    const result = SkillsPackageEntrySchema.safeParse({
      name: 'test',
      description: 'test',
      version: '1.0',
      content: 'test',
      stability: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('SkillsPackageEntrySchema rejects invalid cost_class', () => {
    const result = SkillsPackageEntrySchema.safeParse({
      name: 'test',
      description: 'test',
      version: '1.0',
      content: 'test',
      cost_class: 'extreme',
    });

    expect(result.success).toBe(false);
  });

  it('BundleMetadataSchema accepts all fields', () => {
    const meta = BundleMetadataSchema.parse({
      stability: 'experimental',
      cost_class: 'heavy',
      origin: 'ECC',
      dependencies: ['core', 'security'],
    });

    expect(meta.stability).toBe('experimental');
    expect(meta.cost_class).toBe('heavy');
    expect(meta.origin).toBe('ECC');
    expect(meta.dependencies).toEqual(['core', 'security']);
  });

  it('BundleMetadataSchema defaults all fields', () => {
    const meta = BundleMetadataSchema.parse({});

    expect(meta.stability).toBe('stable');
    expect(meta.cost_class).toBe('medium');
    expect(meta.origin).toBe('custom');
    expect(meta.dependencies).toEqual([]);
  });

  it('SoulSchema still validates with extended skill packages', () => {
    const soul = {
      version: '2.0',
      metadata: {
        created: '2026-04-07T00:00:00Z',
        source_agent: 'opencode',
        target_compatibility: ['claude-code'],
      },
      identity: {
        name: 'TestAgent',
        role: 'Developer',
        about_me: 'I am a test agent.',
      },
      skills_package: {
        packages: [
          {
            name: 'django-tdd',
            description: 'Django TDD',
            version: '1.0',
            content: 'Content.',
            dependencies: ['django-patterns'],
            stability: 'stable',
            cost_class: 'light',
            origin: 'community',
          },
        ],
      },
      tools_full_text: 'I use various tools.',
      principles_full_text: 'I follow best practices.',
      memories: {
        type: 'full',
        entries: [],
      },
      agent_config: {},
    };

    const result = SoulSchema.safeParse(soul);
    expect(result.success).toBe(true);
  });
});