import { describe, it, expect } from 'vitest';
import { serializeSoul, deserializeSoul } from '@/soul/serializer';

const sampleSoul = {
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
  tools_full_text: 'I prefer dedicated tools.',
  principles_full_text: 'Read before edit.',
  memories: {
    type: 'full',
    entries: [],
  },
  agent_config: {},
};

describe('soul serializer', () => {
  it('round-trips YAML correctly', () => {
    const yaml = serializeSoul(sampleSoul);
    const parsed = deserializeSoul(yaml);

    expect(parsed.version).toBe('2.0');
    expect(parsed.identity.name).toBe('TestAgent');
    expect(parsed.metadata.source_agent).toBe('opencode');
    expect(parsed.tools_full_text).toBe('I prefer dedicated tools.');
    expect(parsed.memories.entries.length).toBe(0);
  });

  it('serializes with multi-line text blocks', () => {
    const soulWithMultiline = {
      ...sampleSoul,
      tools_full_text: 'Line 1\nLine 2\nLine 3',
      principles_full_text: 'Principle 1\nPrinciple 2',
    };

    const yaml = serializeSoul(soulWithMultiline);
    const parsed = deserializeSoul(yaml);

    expect(parsed.tools_full_text).toBe('Line 1\nLine 2\nLine 3');
    expect(parsed.principles_full_text).toBe('Principle 1\nPrinciple 2');
  });

  it('deserializes valid YAML string', () => {
    const yaml = `
version: "2.0"
metadata:
  created: "2026-04-07T00:00:00Z"
  source_agent: "claude-code"
  target_compatibility: ["opencode"]
identity:
  name: "YamlAgent"
  role: "Writer"
  about_me: "I process YAML."
skills_package:
  packages: []
tools_full_text: "Tools here"
principles_full_text: "Principles here"
memories:
  type: "full"
  entries: []
agent_config: {}
`;

    const soul = deserializeSoul(yaml);
    expect(soul.identity.name).toBe('YamlAgent');
    expect(soul.metadata.source_agent).toBe('claude-code');
  });

  it('throws on invalid YAML', () => {
    expect(() => deserializeSoul('not: valid: yaml:')).toThrow();
  });

  it('throws on incomplete soul YAML', () => {
    const incompleteYaml = `
version: "2.0"
identity:
  name: "Test"
`;

    expect(() => deserializeSoul(incompleteYaml)).toThrow();
  });
});
