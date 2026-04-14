import { logger } from '../utils/logger.js';
import { SUPPORTED_AGENTS, type SupportedAgent } from '../utils/config.js';

interface OnboardOptions {
  from?: string;
  into?: string;
}

export async function onboardWizard(options: OnboardOptions): Promise<void> {
  const sourceAgent = options.from as SupportedAgent | undefined;
  const targetAgent = options.into as SupportedAgent | undefined;

  if (sourceAgent && !SUPPORTED_AGENTS.includes(sourceAgent)) {
    logger.error(`Unsupported source agent: ${sourceAgent}. Supported: ${SUPPORTED_AGENTS.join(', ')}`);
    return;
  }

  if (targetAgent && !SUPPORTED_AGENTS.includes(targetAgent)) {
    logger.error(`Unsupported target agent: ${targetAgent}. Supported: ${SUPPORTED_AGENTS.join(', ')}`);
    return;
  }

  logger.info('Mode 2: Configuration-guided onboarding');
  logger.info(`Source: ${sourceAgent || 'auto-detect'}`);
  logger.info(`Target: ${targetAgent || 'auto-detect'}`);
  logger.info('TODO: Implement interactive wizard steps');
  logger.info('  1. Memory range selection');
  logger.info('  2. External memory integration (Obsidian, Notion, etc.)');
  logger.info('  3. Confirm identity/tools/principles/cron (default: full copy)');
  logger.info('  4. Generate soul file and inject');
}
