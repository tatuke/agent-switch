import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export interface CollectBundleOptions {
  sourceUserAtHost: string;
  sourcePort: number;
  sourcePackPath: string;
  localOutputDir: string;
}

export async function collectBundle(options: CollectBundleOptions): Promise<string | null> {
  const { sourceUserAtHost, sourcePort, sourcePackPath, localOutputDir } = options;
  const parts = sourceUserAtHost.trim().split('@');
  const user = parts[0];
  const host = parts[1];

  const remoteBundle = `${sourcePackPath}/.astp-bundle`;
  const localBundle = path.resolve(localOutputDir);

  logger.info(`Collecting bundle from ${user}@${host}:${remoteBundle} → ${localBundle}`);

  try {
    await fs.ensureDir(localBundle);
    await execFileAsync('scp', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-r',
      '-P', String(sourcePort),
      `${user}@${host}:${remoteBundle}/`,
      localBundle,
    ]);
    logger.info(`Bundle collected at: ${localBundle}`);
    return localBundle;
  } catch (e) {
    logger.error(`Failed to collect bundle: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function transferBundleToTarget(
  localBundleDir: string,
  targetUserAtHost: string,
  targetPort: number,
  targetPackPath: string,
): Promise<boolean> {
  const parts = targetUserAtHost.trim().split('@');
  const user = parts[0];
  const host = parts[1];
  const remoteTarget = `${targetPackPath}/.astp-bundle`;

  logger.info(`Transferring bundle to ${user}@${host}:${remoteTarget}`);

  try {
    await execFileAsync('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-p', String(targetPort),
      `${user}@${host}`,
      `mkdir -p ${remoteTarget}`,
    ]);

    await execFileAsync('scp', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-r',
      '-P', String(targetPort),
      `${localBundleDir}/`,
      `${user}@${host}:${remoteTarget}/`,
    ]);

    logger.info('Transfer complete.');
    logger.info(`请在目标端 agent session 中读取 ${remoteTarget} 并执行 adaptys.md`);
    return true;
  } catch (e) {
    logger.error(`Transfer failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

export async function promptTransferDecision(): Promise<'transfer' | 'save_only'> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '打包完成。是否立即将 bundle 传输到目标端？',
      choices: [
        { name: 'Yes — 立即传输', value: 'transfer' },
        { name: 'No — 仅保存本地', value: 'save_only' },
      ],
    },
  ]);

  return action;
}