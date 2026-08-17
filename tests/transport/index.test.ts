import { describe, expect, test } from 'vitest';
import {
  buildDefaultTransportPlanName,
  classifySshError,
  getSuggestionForIssue,
  normalizeAgentName,
  parseUserAtHost,
} from '../../src/transport/index';

describe('transport helpers', () => {
  test('parseUserAtHost parses a valid SSH target', () => {
    expect(parseUserAtHost('alice@10.0.0.8')).toEqual({
      user: 'alice',
      host: '10.0.0.8',
    });
  });

  test('parseUserAtHost rejects a host without user', () => {
    expect(() => parseUserAtHost('10.0.0.8')).toThrow('user@host');
  });

  test('normalizeAgentName normalizes spacing and case', () => {
    expect(normalizeAgentName('Claude Code')).toBe('claude-code');
  });

  test('classifySshError identifies permission issues', () => {
    expect(classifySshError('Permission denied (publickey).')).toBe('auth_failed');
  });

  test('classifySshError identifies DNS failures', () => {
    expect(classifySshError('ssh: Could not resolve hostname demo: Name or service not known')).toBe('dns_not_found');
  });

  test('classifySshError identifies timeouts', () => {
    expect(classifySshError('Connection timed out during banner exchange')).toBe('timeout');
  });

  test('classifySshError identifies refused ports', () => {
    expect(classifySshError('ssh: connect to host 10.0.0.8 port 22: Connection refused')).toBe('connection_refused');
  });

  test('getSuggestionForIssue returns actionable guidance', () => {
    expect(getSuggestionForIssue('auth_failed')).toContain('SSH');
  });

  test('buildDefaultTransportPlanName uses normalized agent names', () => {
    expect(buildDefaultTransportPlanName('Claude Code', 'OpenCode')).toMatch(/^claude-code-to-opencode-/);
  });
});
