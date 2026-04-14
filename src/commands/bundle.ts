import path from 'path';
import { SUPPORTED_AGENTS, type SupportedAgent } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs-extra';

interface BundleOptions {
  input?: string;
  inject?: string;
}

const BUNDLE_META_FILE = 'bundle.json';
const BUNDLE_SOUL_FILE = 'soul.yaml';

export async function processBundle(options: BundleOptions): Promise<void> {
  if (!options.input) {
    logger.error('Input bundle path is required (--input)');
    return;
  }

  const bundleDir = path.resolve(options.input);

  if (!await fs.pathExists(bundleDir)) {
    logger.error(`Bundle directory not found: ${bundleDir}`);
    return;
  }

  const metaPath = path.join(bundleDir, BUNDLE_META_FILE);
  const soulPath = path.join(bundleDir, BUNDLE_SOUL_FILE);

  if (!await fs.pathExists(soulPath)) {
    logger.error(`Invalid bundle: missing ${BUNDLE_SOUL_FILE}`);
    return;
  }

  logger.info(`Mode 1: Processing Agent self-packaged bundle`);
  logger.info(`Bundle directory: ${bundleDir}`);

  if (await fs.pathExists(metaPath)) {
    const meta = await fs.readJson(metaPath);
    logger.info(`Bundle metadata: ${JSON.stringify(meta, null, 2)}`);
  }

  if (options.inject) {
    const targetAgent = options.inject as SupportedAgent;
    if (!SUPPORTED_AGENTS.includes(targetAgent)) {
      logger.error(`Unsupported target agent: ${targetAgent}. Supported: ${SUPPORTED_AGENTS.join(', ')}`);
      return;
    }
    logger.info(`Injecting into: ${targetAgent}`);
    logger.info('TODO: Implement bundle injection');
  } else {
    logger.info('No target agent specified. Use --inject <agent> to inject.');
  }
}
