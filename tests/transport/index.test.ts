import { describe, expect, test } from 'vitest';
import {
  buildDefaultTransportPlanName,
  classifySshError,
  classifyTailcatError,
  getSuggestionForIssue,
  normalizeAgentName,
  parseUserAtHost,
} from '../../src/transport/index';
import { isValidTailcatAddress } from '../../src/session/tailcat-exec';

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

describe('tailcat helpers', () => {
  test('isValidTailcatAddress accepts a tc address', () => {
    expect(isValidTailcatAddress('tcomFwWCCcjS5nKNqAod034nWoJZW0LZqDhhC8U_dKdnDRYQ8uNGFpGQEu')).toBe(true);
  });

  test('isValidTailcatAddress accepts a DNS name', () => {
    expect(isValidTailcatAddress('my-server.example.com')).toBe(true);
  });

  test('isValidTailcatAddress rejects flag-injecting values', () => {
    expect(isValidTailcatAddress('-o/etc/passwd')).toBe(false);
  });

  test('isValidTailcatAddress rejects user@host forms', () => {
    expect(isValidTailcatAddress('alice@10.0.0.8')).toBe(false);
  });

  test('isValidTailcatAddress rejects empty and whitespace values', () => {
    expect(isValidTailcatAddress('')).toBe(false);
    expect(isValidTailcatAddress('tc abc')).toBe(false);
  });

  test('classifyTailcatError identifies a missing binary', () => {
    expect(classifyTailcatError('spawn tailcat ENOENT')).toBe('tailcat_unavailable');
    expect(classifyTailcatError('tailcat: command not found')).toBe('tailcat_unavailable');
  });

  test('classifyTailcatError identifies timeouts', () => {
    expect(classifyTailcatError('ping timed out waiting for direct connection')).toBe('timeout');
  });

  test('classifyTailcatError identifies malformed addresses', () => {
    expect(classifyTailcatError('invalid tailcat address: bad address')).toBe('tailcat_invalid_addr');
  });

  test('classifyTailcatError falls back to connect failure', () => {
    expect(classifyTailcatError('server did not respond')).toBe('tailcat_connect_failed');
  });

  test('getSuggestionForIssue returns tailcat guidance', () => {
    expect(getSuggestionForIssue('tailcat_unavailable')).toContain('tailcat');
    expect(getSuggestionForIssue('tailcat_invalid_addr')).toContain('tc');
    expect(getSuggestionForIssue('tailcat_connect_failed')).toContain('tailcat serve');
  });
});
