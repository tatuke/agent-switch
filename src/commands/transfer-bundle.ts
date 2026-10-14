import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { logger } from '../utils/logger.js';
import type { TransferChannel } from '../transport/index.js';
import { tailcatCopyFile, tailcatExecCommand, tailcatFetchFile } from '../session/tailcat-exec.js';

const execFileAsync = promisify(execFile);

const SSH_ARGS = ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10'];
const SCP_ARGS = ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10'];

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseUserHost(userAtHost: string): { user: string; host: string } {
  const parts = userAtHost.trim().split('@');
  return { user: parts[0], host: parts[1] };
}

export interface CollectBundleOptions {
  sourceUserAtHost: string;
  sourcePort: number;
  sourcePackPath: string;
  channel?: TransferChannel;
  sourceTailcatAddr?: string;
  localOutputDir: string;
}

export async function collectBundleAsZip(options: CollectBundleOptions): Promise<string | null> {
  const { sourceUserAtHost, sourcePort, sourcePackPath, channel = 'ssh', sourceTailcatAddr, localOutputDir } = options;
  const { user, host } = parseUserHost(sourceUserAtHost);
  const isTailcat = channel === 'tailcat' && sourceTailcatAddr;

  const remoteBundleDir = sourcePackPath.replace(/\/+$/, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const remoteZipName = `astp-bundle-${timestamp}.zip`;
  const remoteZipPath = `/tmp/${remoteZipName}`;
  const localZipPath = path.resolve(path.join(localOutputDir, remoteZipName));

  logger.info(`[zip] Packing bundle on ${isTailcat ? `tailcat:${sourceTailcatAddr}` : `${user}@${host}`}:${remoteBundleDir} → ${remoteZipPath}`);

  try {
    if (isTailcat) {
      const addr = sourceTailcatAddr as string;
      await tailcatExecCommand(addr, `bash -lic ${shellEscape(`cd ${shellEscape(remoteBundleDir)} && zip -r ${remoteZipPath} .`)}`, 60000);

      await fs.ensureDir(localOutputDir);
      await tailcatFetchFile(addr, remoteZipPath, localZipPath);

      await tailcatExecCommand(addr, `rm -f ${remoteZipPath}`, 10000);
    } else {
      await sshExec(`bash -lic ${shellEscape(`cd ${shellEscape(remoteBundleDir)} && zip -r ${remoteZipPath} .`)}`, user, host, sourcePort, 60000);

      await fs.ensureDir(localOutputDir);
      await execFileAsync('scp', [
        ...SCP_ARGS,
        '-P', String(sourcePort),
        `${user}@${host}:${remoteZipPath}`,
        localZipPath,
      ]);

      await sshExec(`rm -f ${remoteZipPath}`, user, host, sourcePort, 10000);
    }

    logger.info(`Bundle zip collected at: ${localZipPath}`);
    return localZipPath;
  } catch (e) {
    logger.error(`Failed to collect bundle: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export interface TransferZipOptions {
  localZipPath: string;
  targetUserAtHost: string;
  targetPort: number;
  targetPackPath: string;
  channel?: TransferChannel;
  targetTailcatAddr?: string;
}

export async function transferZipToTarget(options: TransferZipOptions): Promise<string | null> {
  const { localZipPath, targetUserAtHost, targetPort, targetPackPath, channel = 'ssh', targetTailcatAddr } = options;
  const { user, host } = parseUserHost(targetUserAtHost);
  const isTailcat = channel === 'tailcat' && targetTailcatAddr;

  const zipFileName = path.basename(localZipPath);
  const remoteZipPath = `${targetPackPath.replace(/\/+$/, '')}/${zipFileName}`;

  logger.info(`Transferring zip to ${isTailcat ? `tailcat:${targetTailcatAddr}` : `${user}@${host}`}:${remoteZipPath}`);

  try {
    if (isTailcat) {
      const addr = targetTailcatAddr as string;
      await tailcatExecCommand(addr, `bash -lic ${shellEscape(`mkdir -p ${targetPackPath}`)}`, 10000);
      await tailcatCopyFile(localZipPath, addr, remoteZipPath);
    } else {
      await sshExec(`bash -lic ${shellEscape(`mkdir -p ${targetPackPath}`)}`, user, host, targetPort, 10000);

      await execFileAsync('scp', [
        ...SCP_ARGS,
        '-P', String(targetPort),
        localZipPath,
        `${user}@${host}:${remoteZipPath}`,
      ]);
    }

    logger.info('Transfer complete.');
    return remoteZipPath;
  } catch (e) {
    logger.error(`Transfer failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

async function sshExec(command: string, user: string, host: string, port: number, timeoutMs?: number): Promise<{ stdout: string; stderr: string }> {
  const args = [...SSH_ARGS, '-p', String(port), `${user}@${host}`, command];
  const opts = timeoutMs ? { timeout: timeoutMs } : {};
  const result = await execFileAsync('ssh', args, opts);
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

export async function promptTransferDecision(): Promise<'transfer' | 'save_locally'> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Bundle packed. Transfer to target now?',
      choices: [
        { name: 'Yes — Transfer now', value: 'transfer' },
        { name: 'No — Save locally', value: 'save_locally' },
      ],
    },
  ]);

  return action;
}
