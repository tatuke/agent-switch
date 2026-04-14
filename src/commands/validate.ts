import { getSoulPathFromInput } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { deserializeSoul } from '../soul/index.js';
import * as fs from 'fs-extra';

export async function validateSoulFile(inputPath: string): Promise<void> {
  const resolvedPath = getSoulPathFromInput(inputPath);

  if (!await fs.pathExists(resolvedPath)) {
    logger.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const soul = deserializeSoul(content);
    logger.info(`Valid soul: ${soul.identity.name} (${soul.metadata.source_agent})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Invalid soul file: ${message}`);
    process.exit(1);
  }
}
