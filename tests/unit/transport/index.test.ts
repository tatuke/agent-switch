import { describe, it, expect } from 'vitest';
import {
  parseUserAtHost,
  classifySshError,
  normalizeAgentName,
  isLocalHost,
  buildDefaultTransportPlanName,
} from '@/transport/index';

describe('parseUserAtHost', () => {
  it('parses valid user@host', () => {
    expect(parseUserAtHost('alice@203.0.113.5')).toEqual({ user: 'alice', host: '203.0.113.5' });
  });

  it('trims whitespace', () => {
    expect(parseUserAtHost('  bob@example.com  ')).toEqual({ user: 'bob', host: 'example.com' });
  });

  it('throws on missing user', () => {
    expect(() => parseUserAtHost('@host')).toThrow();
  });

  it('throws on missing host', () => {
    expect(() => parseUserAtHost('user@')).toThrow();
  });

  it('throws on missing @', () => {
    expect(() => parseUserAtHost('userhost')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseUserAtHost('')).toThrow();
  });
});

describe('classifySshError', () => {
  it('classifies permission denied', () => {
    expect(classifySshError('Permission denied (publickey)')).toBe('auth_failed');
  });

  it('classifies DNS failure', () => {
    expect(classifySshError('ssh: Could not resolve hostname badhost')).toBe('dns_not_found');
  });

  it('classifies connection timeout', () => {
    expect(classifySshError('Connection timed out')).toBe('timeout');
  });

  it('classifies connection refused', () => {
    expect(classifySshError('Connection refused')).toBe('connection_refused');
  });

  it('classifies SSH unavailable', () => {
    expect(classifySshError('bash: ssh: No such file or directory')).toBe('ssh_unavailable');
  });

  it('returns unknown for unrecognized errors', () => {
    expect(classifySshError('something weird happened')).toBe('unknown');
  });
});

describe('normalizeAgentName', () => {
  it('lowercases and trims', () => {
    expect(normalizeAgentName('  OpenCode  ')).toBe('opencode');
  });

  it('replaces spaces with hyphens', () => {
    expect(normalizeAgentName('claude code')).toBe('claude-code');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeAgentName('my   agent')).toBe('my-agent');
  });
});

describe('isLocalHost', () => {
  it('recognizes localhost', () => {
    expect(isLocalHost('localhost')).toBe(true);
  });

  it('recognizes 127.0.0.1', () => {
    expect(isLocalHost('127.0.0.1')).toBe(true);
  });

  it('recognizes ::1', () => {
    expect(isLocalHost('::1')).toBe(true);
  });

  it('rejects remote hosts', () => {
    expect(isLocalHost('203.0.113.5')).toBe(false);
  });
});

describe('buildDefaultTransportPlanName', () => {
  it('generates name with agents and timestamp', () => {
    const name = buildDefaultTransportPlanName('opencode', 'claude-code');
    expect(name).toMatch(/^opencode-to-claude-code-\d{4}-\d{2}-\d{2}T/);
  });

  it('normalizes agent names', () => {
    const name = buildDefaultTransportPlanName('  Open Code  ', 'Claude Code');
    expect(name).toMatch(/^open-code-to-claude-code-/);
  });
});
