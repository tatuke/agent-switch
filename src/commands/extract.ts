import { logger } from '../utils/logger.js';

interface ExtractOptions {
  from?: string;
  name?: string;
  output?: string;
}

export async function extractSoul(options: ExtractOptions): Promise<void> {
  logger.info(`Extract from: ${options.from || 'auto-detect'}`);
  logger.info(`Name: ${options.name || 'unnamed'}`);
  logger.info(`Output: ${options.output || 'default location'}`);
  logger.info('TODO: Implement extractor for target agent');
}
