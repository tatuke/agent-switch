import { getSoulPathFromInput } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { deserializeSoul } from '../soul/index.js';
import * as fs from 'fs-extra';

interface SwitchOptions {
  to?: string;
}

export async function switchSoul(input: string, options: SwitchOptions): Promise<void> {
  const resolvedPath = getSoulPathFromInput(input);

  if (!await fs.pathExists(resolvedPath)) {
    logger.error(`Soul file not found: ${resolvedPath}`);
    return;
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const soul = deserializeSoul(content);
    logger.info(`Switching to soul: ${soul.identity.name}`);
    logger.info(`Target agent: ${options.to || 'auto-detect'}`);
    logger.info('TODO: Implement switch logic');
  } catch {
    logger.error('Invalid soul file');
  }
}
