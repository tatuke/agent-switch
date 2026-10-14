import * as fs from 'fs-extra';
import path from 'path';
import type { Profile } from '../soul/schema.js';
import { parseUserAtHost } from '../transport/index.js';
import type { ProjectTransferConfig, TransferChannel } from '../transport/index.js';
import { logger } from '../utils/logger.js';
import { buildPackPrompt, buildCliCommand } from './prompt-builder.js';
import { sshCopyFiles, sshExecCommand, sshCheckCommandExists } from './ssh-exec.js';
import { tailcatCheckCommandExists, tailcatCopyFile, tailcatExecCommand } from './tailcat-exec.js';

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function encodeForRemoteShell(command: string): string {
  const b64 = Buffer.from(command, 'utf-8').toString('base64');
  return `bash -lic 'eval "$(echo ${b64} | base64 -d)"'`;
}

interface SessionLaunchOptions {
  sourceProfile: Profile;
  targetProfile: Profile;
  sourceUserAtHost: string;
  sourcePort: number;
  sourcePackPath: string;
  channel?: TransferChannel;
  sourceTailcatAddr?: string;
  localPackysPath: string;
  localTargetProfilePath: string;
  localSourceConfigPath: string;
  remoteSessionDir: string;
  projectConfig?: ProjectTransferConfig;
}

interface SessionLaunchResult {
  success: boolean;
  error?: string;
  bundleRemotePath?: string;
}

export async function launchSourceSession(options: SessionLaunchOptions): Promise<SessionLaunchResult> {
  const {
    sourceProfile,
    targetProfile,
    sourceUserAtHost,
    sourcePort,
    sourcePackPath,
    channel = 'ssh',
    sourceTailcatAddr,
    localPackysPath,
    localTargetProfilePath,
    localSourceConfigPath,
    remoteSessionDir,
    projectConfig,
  } = options;

  const isTailcat = channel === 'tailcat';

  if (isTailcat && !sourceTailcatAddr) {
    return { success: false, error: 'tailcat channel selected but no source tailcat address provided.' };
  }

  const sourceTarget = isTailcat ? undefined : parseUserAtHost(sourceUserAtHost);

  logger.info(`=== Step 1: Source Agent Session (${channel}) ===`);

  logger.info('[1.1] Preparing session materials...');
  const filesToCopy: Record<string, string> = {
    'packys.md': localPackysPath,
    [`${targetProfile.agent}_profile.json`]: localTargetProfilePath,
    [`${sourceProfile.agent}_config-locations.json`]: localSourceConfigPath,
  };

  try {
    if (isTailcat) {
      const addr = sourceTailcatAddr as string;
      await tailcatExecCommand(addr, `mkdir -p ${shellEscape(remoteSessionDir)}`);
      for (const [remoteName, localPath] of Object.entries(filesToCopy)) {
        await tailcatCopyFile(localPath, addr, path.posix.join(remoteSessionDir, remoteName));
      }
    } else {
      await sshCopyFiles(sourceTarget!, sourcePort, filesToCopy, remoteSessionDir);
    }
  } catch (e) {
    return { success: false, error: `Failed to copy files: ${e instanceof Error ? e.message : String(e)}` };
  }

  const cliCommand = sourceProfile.session_launch.command;
  const pipeMode = sourceProfile.session_launch.pipe_mode;
  if (!cliCommand || !pipeMode) {
    return {
      success: false,
      error: `Agent ${sourceProfile.agent} has no CLI command or pipe mode. Use file-copy mode instead.`,
    };
  }

  logger.info('[1.2] Checking CLI availability...');
  const cliExists = isTailcat
    ? await tailcatCheckCommandExists(sourceTailcatAddr as string, cliCommand)
    : await sshCheckCommandExists(sourceTarget!, sourcePort, cliCommand);
  if (!cliExists) {
    return { success: false, error: `CLI command "${cliCommand}" not found on source host. Is ${sourceProfile.agent} installed?` };
  }

  logger.info('[1.3] Launching agent session...');
  const prompt = buildPackPrompt(sourceProfile, targetProfile, remoteSessionDir, sourcePackPath, projectConfig);
  const agentCommand = buildCliCommand(sourceProfile, prompt);
  const fullCommand = `cd ${shellEscape(sourcePackPath)} && ${agentCommand}`;
  const remoteCommand = encodeForRemoteShell(fullCommand);

  const timeoutMs = sourceProfile.session_launch.timeout_seconds * 1000;

  try {
    if (isTailcat) {
      const { stdout, stderr } = await tailcatExecCommand(sourceTailcatAddr as string, remoteCommand, timeoutMs);
      logger.info(`Agent session stdout: ${stdout.substring(0, 200)}`);
      if (stderr) logger.warn(`Agent session stderr: ${stderr.substring(0, 200)}`);
    } else {
      const { stdout, stderr } = await sshExecCommand(sourceTarget!, sourcePort, remoteCommand, timeoutMs);
      logger.info(`Agent session stdout: ${stdout.substring(0, 200)}`);
      if (stderr) logger.warn(`Agent session stderr: ${stderr.substring(0, 200)}`);
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error(`Agent session failed: ${errorMsg}`);
    return { success: false, error: `Agent session execution failed: ${errorMsg}` };
  }

  logger.info('[1.4] Checking bundle result...');
  const manifestPath = `${sourcePackPath}/manifest.yaml`;
  try {
    if (isTailcat) {
      await tailcatExecCommand(sourceTailcatAddr as string, `test -e ${shellEscape(manifestPath)}`, 10000);
    } else {
      await sshExecCommand(sourceTarget!, sourcePort, `test -e ${shellEscape(manifestPath)}`, 10000);
    }
  } catch {
    return { success: false, error: 'Bundle manifest not found after session. Packing may have failed.' };
  }

  logger.info('[1.5] Session complete.');
  return { success: true, bundleRemotePath: sourcePackPath };
}
