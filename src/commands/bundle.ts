import path from 'path';
import { SUPPORTED_AGENTS, type SupportedAgent } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs-extra';

interface BundleOptions {
  input?: string;
  inject?: string;
}

const BUNDLE_MANIFEST_FILE = 'manifest.yaml';
const BUNDLE_IDENTITY_FILE = 'identity.md';
const BUNDLE_ADAPTYS_FILE = 'adaptys.md';
const BUNDLE_ADAPTYS_META_FILE = 'adaptys-meta.yaml';
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

  logger.info(`Mode 1: Processing Agent self-packaged bundle`);
  logger.info(`Bundle directory: ${bundleDir}`);

  const integrity = await verifyBundleIntegrity(bundleDir);
  if (!integrity.valid) {
    logger.error(`Bundle integrity check failed: ${integrity.missing.join(', ')}`);
    return;
  }

  logger.info(`Bundle integrity: OK (${integrity.files.join(', ')})`);

  if (integrity.hasAdaptys) {
    logger.info('Customized adaptys included — target agent can use pre-computed compatibility matrix');
  } else {
    logger.info('No adaptys included — target agent will need to self-assess compatibility');
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

export async function verifyBundleIntegrity(bundleDir: string): Promise<{
  valid: boolean;
  missing: string[];
  files: string[];
  hasAdaptys: boolean;
}> {
  const requiredFiles = [BUNDLE_MANIFEST_FILE, BUNDLE_IDENTITY_FILE];
  const optionalFiles = [BUNDLE_ADAPTYS_FILE, BUNDLE_ADAPTYS_META_FILE, BUNDLE_SOUL_FILE];
  const allExpected = [...requiredFiles, ...optionalFiles];

  const found: string[] = [];
  const missing: string[] = [];

  for (const file of allExpected) {
    const filePath = path.join(bundleDir, file);
    if (await fs.pathExists(filePath)) {
      found.push(file);
    } else if (requiredFiles.includes(file)) {
      missing.push(file);
    }
  }

  const hasAdaptys = await fs.pathExists(path.join(bundleDir, BUNDLE_ADAPTYS_FILE))
    && await fs.pathExists(path.join(bundleDir, BUNDLE_ADAPTYS_META_FILE));

  return {
    valid: missing.length === 0,
    missing,
    files: found,
    hasAdaptys,
  };
}