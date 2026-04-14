import { getSoulPathFromInput } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { deserializeSoul, serializeSoul } from '../soul/index.js';
import * as fs from 'fs-extra';

export async function editSoul(input: string): Promise<void> {
  const resolvedPath = getSoulPathFromInput(input);

  if (!await fs.pathExists(resolvedPath)) {
    logger.error(`Soul file not found: ${resolvedPath}`);
    return;
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const soul = deserializeSoul(content);
    logger.info(`Editing soul: ${soul.identity.name}`);
    logger.info('TODO: Implement interactive editor');
  } catch {
    logger.error('Invalid soul file');
  }
}
