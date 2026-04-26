import * as fs from 'fs-extra';
import path from 'path';
import type { Profile } from '../soul/schema.js';
import { parseUserAtHost } from '../transport/index.js';
import { logger } from '../utils/logger.js';
import { buildPackPrompt, buildCliCommand } from './prompt-builder.js';
import { sshCopyFiles, sshExecCommand, sshCheckCommandExists } from './ssh-exec.js';

interface SessionLaunchOptions {
  sourceProfile: Profile;
  targetProfile: Profile;
  sourceUserAtHost: string;
  sourcePort: number;
  sourcePackPath: string;
  localPackysPath: string;
  localTargetProfilePath: string;
  localSourceConfigPath: string;
  remoteSessionDir: string;
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
    localPackysPath,
    localTargetProfilePath,
    localSourceConfigPath,
    remoteSessionDir,
  } = options;

  const sourceTarget = parseUserAtHost(sourceUserAtHost);

  logger.info('=== Step 1: Source Agent Session ===');

  logger.info('[1.1] Preparing session materials...');
  const filesToCopy: Record<string, string> = {
    'packys.md': localPackysPath,
    [`${targetProfile.agent}_profile.json`]: localTargetProfilePath,
    [`${sourceProfile.agent}_config-locations.json`]: localSourceConfigPath,
  };

  try {
    await sshCopyFiles(sourceTarget, sourcePort, filesToCopy, remoteSessionDir);
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
  const cliExists = await sshCheckCommandExists(sourceTarget, sourcePort, cliCommand);
  if (!cliExists) {
    return { success: false, error: `CLI command "${cliCommand}" not found on source host. Is ${sourceProfile.agent} installed?` };
  }

  logger.info('[1.3] Launching agent session...');
  const prompt = buildPackPrompt(sourceProfile, targetProfile, remoteSessionDir);
  const cliFullCommand = buildCliCommand(sourceProfile, prompt);

  const timeoutMs = sourceProfile.session_launch.timeout_seconds * 1000;

  try {
    const { stdout, stderr } = await sshExecCommand(sourceTarget, sourcePort, cliFullCommand, timeoutMs);
    logger.info(`Agent session stdout: ${stdout.substring(0, 200)}`);
    if (stderr) logger.warn(`Agent session stderr: ${stderr.substring(0, 200)}`);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error(`Agent session failed: ${errorMsg}`);
    return { success: false, error: `Agent session execution failed: ${errorMsg}` };
  }

  logger.info('[1.4] Checking bundle result...');
  const manifestPath = `${sourcePackPath}/.astp-bundle/manifest.yaml`;
  const manifestCheck = await sshExecCommand(sourceTarget, sourcePort, `test -e '${manifestPath.replace(/'/g, "'\\''")}'`, 10000);

  if (!manifestCheck) {
    return { success: false, error: 'Bundle manifest not found after session. Packing may have failed.' };
  }

  logger.info('[1.5] Session complete.');
  return { success: true, bundleRemotePath: `${sourcePackPath}/.astp-bundle` };
}