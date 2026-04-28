import path from 'path';
import os from 'os';
import * as fs from 'fs-extra';

function findProjectRoot(): string {
  const distDir = path.resolve(__dirname, '..');
  const candidate = path.join(distDir, 'package.json');
  if (fs.pathExistsSync(candidate)) return distDir;
  const parent = path.dirname(distDir);
  if (fs.pathExistsSync(path.join(parent, 'package.json'))) return parent;
  return path.dirname(parent);
}

const PROJECT_ROOT = findProjectRoot();

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

export const ADAPTERS_DIR = path.join(PROJECT_ROOT, 'adapters');

export function getAdapterDir(agentName: string): string {
  return path.join(ADAPTERS_DIR, normalizeAgentDirName(agentName));
}

export function getAdapterProfilePath(agentName: string): string {
  return path.join(getAdapterDir(agentName), 'profile.json');
}

export function getAdapterConfigPath(agentName: string): string {
  return path.join(getAdapterDir(agentName), 'config-locations.json');
}

function normalizeAgentDirName(agentName: string): string {
  return agentName.trim().toLowerCase().replace(/\s+/g, '-');
}
