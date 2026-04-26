import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ParsedUserHost } from '../transport/index.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export async function waitForBundleManifest(
  target: ParsedUserHost,
  port: number,
  remoteBundleDir: string,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<boolean> {
  const manifestPath = `${remoteBundleDir}/manifest.yaml`;
  const startTime = Date.now();

  logger.info(`Monitoring: ${target.user}@${target.host}:${manifestPath}`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      await execFileAsync('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ConnectTimeout=5',
        '-p', String(port),
        `${target.user}@${target.host}`,
        `test -e ${manifestPath}`,
      ]);
      logger.info('Bundle manifest detected — packing complete.');
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  logger.error(`Timeout waiting for bundle manifest after ${timeoutMs}ms`);
  return false;
}