import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export const TAILCAT_PING_TIMEOUT_MS = 30_000;

const TAILCAT_ADDR_RE = /^tc[A-Za-z0-9_-]+$/;
const DNS_NAME_RE = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Validate a tailcat endpoint identifier.
 *
 * Accepted forms:
 * - A tailcat address: `tc` prefix + base64url payload (case-sensitive)
 * - A DNS name published via TXT record ("tailcat=tc...")
 *
 * Rejected: empty, whitespace, `@`, leading `-` (flag injection), colons.
 */
export function isValidTailcatAddress(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v) || v.includes('@') || v.startsWith('-') || v.includes(':')) {
    return false;
  }
  return TAILCAT_ADDR_RE.test(v) || DNS_NAME_RE.test(v);
}

export async function isTailcatInstalled(): Promise<boolean> {
  try {
    await execFileAsync('which', ['tailcat']);
    return true;
  } catch {
    return false;
  }
}

export async function tailcatExecCommand(
  address: string,
  command: string,
  timeoutMs?: number,
): Promise<{ stdout: string; stderr: string }> {
  logger.info(`tailcat ssh: ${address} — ${command.substring(0, 80)}...`);

  const options: import('node:child_process').ExecFileOptions = timeoutMs ? { timeout: timeoutMs } : {};
  const result = await execFileAsync('tailcat', ['ssh', address, command], options);
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

export async function tailcatCopyFile(localPath: string, address: string, remotePath: string): Promise<void> {
  logger.info(`tailcat cp: ${localPath} → ${address}:${remotePath}`);
  await execFileAsync('tailcat', ['cp', localPath, `${address}:${remotePath}`]);
}

export async function tailcatFetchFile(address: string, remotePath: string, localPath: string): Promise<void> {
  logger.info(`tailcat cp: ${address}:${remotePath} → ${localPath}`);
  await execFileAsync('tailcat', ['cp', `${address}:${remotePath}`, localPath]);
}

export async function tailcatCheckCommandExists(address: string, command: string): Promise<boolean> {
  try {
    await execFileAsync('tailcat', [
      'ssh',
      address,
      `bash -lic ${shellEscape(`command -v ${shellEscape(command)}`)}`,
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe connectivity through a tailcat tunnel.
 * `--until-direct` keeps pinging until the direct UDP path is established,
 * avoiding rate-limited shared DERP relays for bulk transfers.
 */
export async function tailcatPingUntilDirect(
  address: string,
  timeoutMs: number = TAILCAT_PING_TIMEOUT_MS,
): Promise<string> {
  const result = await execFileAsync('tailcat', ['ping', '--until-direct', address], { timeout: timeoutMs });
  return result.stdout.toString();
}
