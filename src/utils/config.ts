import path from 'path';
import os from 'os';

export const ASTP_DIR = path.join(os.homedir(), '.astp');
export const SOULS_DIR = path.join(ASTP_DIR, 'souls');
export const TRANSFERS_DIR = path.join(ASTP_DIR, 'transfers');

export const SUPPORTED_AGENTS = [
  'opencode',
  'claude-code',
  'openclaw',
  'codex',
  'gemini-cli',
  'hermes',
  'cursor',
  'kiro',
] as const;
export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

export function getSoulPath(name: string): string {
  return path.join(SOULS_DIR, `${name}.yaml`);
}

export function getTransferPlanPath(name: string): string {
  return path.join(TRANSFERS_DIR, `${name}.yaml`);
}

export function getSoulPathFromInput(input: string): string {
  if (path.isAbsolute(input)) return input;
  if (input.endsWith('.yaml') || input.endsWith('.yml')) return path.resolve(input);
  return getSoulPath(input);
}
