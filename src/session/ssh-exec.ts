import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
import type { ParsedUserHost } from '../transport/index.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const SSH_COMMON_ARGS = ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4'];

export async function sshCopyFiles(
  target: ParsedUserHost,
  port: number,
  localFiles: Record<string, string>,
  remoteDir: string,
): Promise<void> {
  await sshExecCommand(target, port, `mkdir -p ${shellEscape(remoteDir)}`);

  for (const [remoteName, localPath] of Object.entries(localFiles)) {
    const remotePath = path.posix.join(remoteDir, remoteName);
    logger.info(`Copying ${localPath} → ${target.user}@${target.host}:${remotePath}`);

    await execFileAsync('scp', [
      ...SSH_COMMON_ARGS,
      '-P', String(port),
      localPath,
      `${target.user}@${target.host}:${remotePath}`,
    ]);
  }
}

export async function sshExecCommand(
  target: ParsedUserHost,
  port: number,
  command: string,
  timeoutMs?: number,
  allocateTty?: boolean,
): Promise<{ stdout: string; stderr: string }> {
  const sshArgs = [
    ...SSH_COMMON_ARGS,
    '-p', String(port),
  ];

  if (allocateTty) {
    sshArgs.push('-tt');
  }

  sshArgs.push(`${target.user}@${target.host}`, command);

  logger.info(`SSH exec: ${target.user}@${target.host} — ${command.substring(0, 80)}...`);

  const options: import('node:child_process').ExecFileOptions = timeoutMs ? { timeout: timeoutMs } : {};
  const result = await execFileAsync('ssh', sshArgs, options);
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

export async function sshCheckCommandExists(
  target: ParsedUserHost,
  port: number,
  command: string,
): Promise<boolean> {
  try {
    await execFileAsync('ssh', [
      ...SSH_COMMON_ARGS,
      '-p', String(port),
      `${target.user}@${target.host}`,
      `bash -lic ${shellEscape(`command -v ${shellEscape(command)}`)}`,
    ]);
    return true;
  } catch {
    return false;
  }
}