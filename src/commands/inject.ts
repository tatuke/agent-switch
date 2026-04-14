import { getSoulPathFromInput } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { deserializeSoul } from '../soul/index.js';
import * as fs from 'fs-extra';

interface InjectOptions {
  soul?: string;
  into?: string;
}

export async function injectSoul(options: InjectOptions): Promise<void> {
  if (!options.soul) {
    logger.error('Soul name or path is required');
    return;
  }

  const resolvedPath = getSoulPathFromInput(options.soul);

  if (!await fs.pathExists(resolvedPath)) {
    logger.error(`Soul file not found: ${resolvedPath}`);
    return;
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const soul = deserializeSoul(content);
    logger.info(`Injecting soul: ${soul.identity.name}`);
    logger.info(`Target agent: ${options.into || 'auto-detect'}`);
    logger.info('TODO: Implement injector for target agent');
  } catch {
    logger.error('Invalid soul file');
  }
}
