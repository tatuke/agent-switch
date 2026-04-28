import inquirer from 'inquirer';
import yaml from 'js-yaml';
import path from 'node:path';
import os from 'node:os';
import * as fs from 'fs-extra';
import { getTransferPlanPath, getAdapterProfilePath, getAdapterConfigPath, ADAPTERS_DIR, logger } from '../utils/index.js';
import { SUPPORTED_AGENTS, type SupportedAgent } from '../utils/config.js';
import {
  DEFAULT_SSH_PORT,
  buildDefaultTransportPlanName,
  checkEndpoint,
  normalizeAgentName,
  type EndpointCheckResult,
  type TransferEndpoint,
  type TransportPlan,
} from '../transport/index.js';
import { loadProfile, hasCliSession } from '../adaptys/index.js';
import type { Profile } from '../soul/schema.js';
import { launchSourceSession } from '../session/session-launcher.js';
import { collectBundleAsZip, transferZipToTarget, promptTransferDecision } from './transfer-bundle.js';

interface TransportWizardState {
  sourceAgent: string;
  sourceUserAtHost: string;
  sourcePackPath: string;
  sourcePort: number;
  targetAgent: string;
  targetUserAtHost: string;
  targetPackPath: string;
  targetPort: number;
  outputPath: string;
  skipCheck: boolean;
  saveOnly: boolean;
  planFile?: string;
  sourceProfile?: Profile;
  targetProfile?: Profile;
}

export async function configureTransport(options: {
  plan?: string;
  planFile?: string;
  saveOnly?: boolean;
  skipCheck?: boolean;
  sourceAgent?: string;
  sourceHost?: string;
  sourcePath?: string;
  sourcePort?: string;
  targetAgent?: string;
  targetHost?: string;
  targetPath?: string;
  targetPort?: string;
  output?: string;
}): Promise<void> {
  const planPath = options.plan || options.planFile;
  if (planPath) {
    await executeFromPlan(planPath, options.saveOnly);
    return;
  }

  const state: TransportWizardState = {
    sourceAgent: options.sourceAgent || '',
    sourceUserAtHost: options.sourceHost || '',
    sourcePackPath: options.sourcePath || '',
    sourcePort: parsePort(options.sourcePort, DEFAULT_SSH_PORT),
    targetAgent: options.targetAgent || '',
    targetUserAtHost: options.targetHost || '',
    targetPackPath: options.targetPath || '',
    targetPort: parsePort(options.targetPort, DEFAULT_SSH_PORT),
    outputPath: options.output || '',
    skipCheck: options.skipCheck || false,
    saveOnly: options.saveOnly || false,
  };

  logger.info('=== ASTP Transport Wizard ===');
  logger.info('Step-by-step guided configuration. Press Ctrl+C to cancel at any time.');

  await step1_selectSourceAgent(state);
  await step2_selectTargetAgent(state);
  await step3_enterSourceEndpoint(state);
  await step4_enterSourcePackPath(state);
  await step5_enterTargetEndpoint(state);
  await step6_enterTargetPackPath(state);
  await step7_connectivityTest(state);
  const confirmed = await step8_previewAndEdit(state);
  if (!confirmed) {
    logger.info('Transport plan cancelled.');
    return;
  }
  await step10_executeOrSave(state);
}

async function step1_selectSourceAgent(state: TransportWizardState): Promise<void> {
  if (state.sourceAgent) {
    logger.info(`[Step 1] Source agent: ${state.sourceAgent} (from flags)`);
    return;
  }

  const { sourceAgent } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sourceAgent',
      message: '[Step 1] Select source agent:',
      choices: [
        ...SUPPORTED_AGENTS.map((a) => ({ name: a, value: a })),
        { name: 'Custom (enter name)', value: 'custom' },
      ],
    },
  ]);

  if (sourceAgent === 'custom') {
    const { customName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customName',
        message: 'Enter custom source agent name:',
        validate: (v: string) => v.trim().length > 0 ? true : 'Name is required.',
      },
    ]);
    state.sourceAgent = normalizeAgentName(customName);
  } else {
    state.sourceAgent = sourceAgent;
  }
}

async function step2_selectTargetAgent(state: TransportWizardState): Promise<void> {
  if (state.targetAgent) {
    logger.info(`[Step 2] Target agent: ${state.targetAgent} (from flags)`);
    return;
  }

  const { targetAgent } = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetAgent',
      message: '[Step 2] Select target agent:',
      choices: [
        ...SUPPORTED_AGENTS.map((a) => ({ name: a, value: a })),
        { name: 'Custom (enter name)', value: 'custom' },
      ],
    },
  ]);

  if (targetAgent === 'custom') {
    const { customName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customName',
        message: 'Enter custom target agent name:',
        validate: (v: string) => v.trim().length > 0 ? true : 'Name is required.',
      },
    ]);
    state.targetAgent = normalizeAgentName(customName);
  } else {
    state.targetAgent = targetAgent;
  }

  if (state.targetAgent === state.sourceAgent) {
    logger.warn('Source and target agents are the same. Continue anyway?');
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue with same source and target?',
        default: false,
      },
    ]);
    if (!proceed) {
      await step2_selectTargetAgent(state);
    }
  }
}

async function step3_enterSourceEndpoint(state: TransportWizardState): Promise<void> {
  if (state.sourceUserAtHost) {
    logger.info(`[Step 3] Source endpoint: ${state.sourceUserAtHost} (from flags)`);
    return;
  }

  const { sourceUserAtHost, sourcePort } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourceUserAtHost',
      message: '[Step 3] Source endpoint (user@host):',
      validate: (v: string) => {
        const parts = v.trim().split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return 'Must use format user@host (e.g., alice@10.0.0.5).';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'sourcePort',
      message: 'Source SSH port:',
      default: String(DEFAULT_SSH_PORT),
      validate: validatePort,
    },
  ]);

  state.sourceUserAtHost = sourceUserAtHost.trim();
  state.sourcePort = parsePort(sourcePort, DEFAULT_SSH_PORT);
}

async function step4_enterSourcePackPath(state: TransportWizardState): Promise<void> {
  if (state.sourcePackPath) {
    logger.info(`[Step 4] Source packpath: ${state.sourcePackPath} (from flags)`);
    return;
  }

  const { sourcePackPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePackPath',
      message: '[Step 4] Source pack path on source host:',
      validate: (v: string) => v.trim().length > 0 ? true : 'Pack path is required.',
    },
  ]);

  state.sourcePackPath = sourcePackPath.trim();
}

async function step5_enterTargetEndpoint(state: TransportWizardState): Promise<void> {
  if (state.targetUserAtHost) {
    logger.info(`[Step 5] Target endpoint: ${state.targetUserAtHost} (from flags)`);
    return;
  }

  const { targetUserAtHost, targetPort } = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetUserAtHost',
      message: '[Step 5] Target endpoint (user@host):',
      validate: (v: string) => {
        const parts = v.trim().split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return 'Must use format user@host (e.g., bob@192.168.1.10).';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'targetPort',
      message: 'Target SSH port:',
      default: String(DEFAULT_SSH_PORT),
      validate: validatePort,
    },
  ]);

  state.targetUserAtHost = targetUserAtHost.trim();
  state.targetPort = parsePort(targetPort, DEFAULT_SSH_PORT);
}

async function step6_enterTargetPackPath(state: TransportWizardState): Promise<void> {
  if (state.targetPackPath) {
    logger.info(`[Step 6] Target packpath: ${state.targetPackPath} (from flags)`);
    return;
  }

  const { targetPackPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetPackPath',
      message: '[Step 6] Target pack path on target host:',
      validate: (v: string) => v.trim().length > 0 ? true : 'Pack path is required.',
    },
  ]);

  state.targetPackPath = targetPackPath.trim();
}

async function step7_connectivityTest(state: TransportWizardState): Promise<void> {
  if (state.skipCheck) {
    logger.info('[Step 7] Connectivity test: SKIPPED (--skip-check)');
    return;
  }

  logger.info('[Step 7] Running connectivity and path validation...');

  const source: TransferEndpoint = {
    agent: state.sourceAgent,
    userAtHost: state.sourceUserAtHost,
    packPath: state.sourcePackPath,
    port: state.sourcePort,
  };

  const target: TransferEndpoint = {
    agent: state.targetAgent,
    userAtHost: state.targetUserAtHost,
    packPath: state.targetPackPath,
    port: state.targetPort,
  };

  const sourceCheck = await checkEndpoint(source, 'source');
  const targetCheck = await checkEndpoint(target, 'target');

  printCheckSummary('source', sourceCheck);
  printCheckSummary('target', targetCheck);

  const hasErrors = [sourceCheck, targetCheck].some(
    (r) => r.connectivity === 'error' || r.pathStatus === 'error',
  );

  if (hasErrors) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Validation found blocking errors. What would you like to do?',
        choices: [
          { name: 'Save plan only (fix errors later)', value: 'save_only' },
          { name: 'Edit parameters and retry', value: 'edit' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'save_only') {
      state.saveOnly = true;
    } else if (action === 'edit') {
      await step8_previewAndEdit(state);
      return;
    } else {
      logger.info('Transport plan cancelled.');
      process.exit(0);
    }
  } else {
    logger.info('[Step 7] All checks passed.');
  }
}

async function step8_previewAndEdit(state: TransportWizardState): Promise<boolean> {
  logger.info('[Step 8] Transport Plan Preview:');
  logger.info('');
  logger.info('  | Field         | Source                    | Target                    |');
  logger.info('  |---------------|---------------------------|---------------------------|');
  logger.info(`  | Agent         | ${state.sourceAgent.padEnd(25)} | ${state.targetAgent.padEnd(25)} |`);
  logger.info(`  | Endpoint      | ${state.sourceUserAtHost.padEnd(25)} | ${state.targetUserAtHost.padEnd(25)} |`);
  logger.info(`  | SSH Port      | ${String(state.sourcePort).padEnd(25)} | ${String(state.targetPort).padEnd(25)} |`);
  logger.info(`  | Pack Path     | ${state.sourcePackPath.padEnd(25)} | ${state.targetPackPath.padEnd(25)} |`);
  logger.info('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Confirm — proceed with this plan', value: 'confirm' },
        { name: 'Edit — change parameters', value: 'edit' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'confirm') {
    return true;
  } else if (action === 'edit') {
    const { editField: fieldToEdit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editField',
        message: 'Which field to edit?',
        choices: [
          'sourceAgent',
          'sourceUserAtHost',
          'sourcePackPath',
          'sourcePort',
          'targetAgent',
          'targetUserAtHost',
          'targetPackPath',
          'targetPort',
        ],
      },
    ]);

    await editField(fieldToEdit, state);
    return step8_previewAndEdit(state);
  } else {
    return false;
  }
}

async function editField(field: string, state: TransportWizardState): Promise<void> {
  switch (field) {
    case 'sourceAgent':
      state.sourceAgent = '';
      await step1_selectSourceAgent(state);
      break;
    case 'sourceUserAtHost':
      state.sourceUserAtHost = '';
      await step3_enterSourceEndpoint(state);
      break;
    case 'sourcePackPath':
      state.sourcePackPath = '';
      await step4_enterSourcePackPath(state);
      break;
    case 'sourcePort': {
      const { sourcePort } = await inquirer.prompt([
        {
          type: 'input',
          name: 'sourcePort',
          message: 'New source SSH port:',
          default: String(state.sourcePort),
          validate: validatePort,
        },
      ]);
      state.sourcePort = parsePort(sourcePort, DEFAULT_SSH_PORT);
      break;
    }
    case 'targetAgent':
      state.targetAgent = '';
      await step2_selectTargetAgent(state);
      break;
    case 'targetUserAtHost':
      state.targetUserAtHost = '';
      await step5_enterTargetEndpoint(state);
      break;
    case 'targetPackPath':
      state.targetPackPath = '';
      await step6_enterTargetPackPath(state);
      break;
    case 'targetPort': {
      const { targetPort } = await inquirer.prompt([
        {
          type: 'input',
          name: 'targetPort',
          message: 'New target SSH port:',
          default: String(state.targetPort),
          validate: validatePort,
        },
      ]);
      state.targetPort = parsePort(targetPort, DEFAULT_SSH_PORT);
      break;
    }
  }
}

async function step10_executeOrSave(state: TransportWizardState): Promise<void> {
  const source: TransferEndpoint = {
    agent: state.sourceAgent,
    userAtHost: state.sourceUserAtHost,
    packPath: state.sourcePackPath,
    port: state.sourcePort,
  };

  const target: TransferEndpoint = {
    agent: state.targetAgent,
    userAtHost: state.targetUserAtHost,
    packPath: state.targetPackPath,
    port: state.targetPort,
  };

  let validation: TransportPlan['validation'];

  if (state.skipCheck) {
    validation = { skipped: true };
  } else {
    const sourceCheck = await checkEndpoint(source, 'source');
    const targetCheck = await checkEndpoint(target, 'target');
    validation = { source: sourceCheck, target: targetCheck };
  }

  const plan: TransportPlan = {
    version: '1.0',
    created_at: new Date().toISOString(),
    source,
    target,
    validation,
  };

  const outputPath = path.resolve(
    state.outputPath || getTransferPlanPath(buildDefaultTransportPlanName(source.agent, target.agent)),
  );

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, yaml.dump(plan, { indent: 2, lineWidth: -1 }), 'utf-8');

  logger.info(`[Step 10] Transport plan saved: ${outputPath}`);

  if (state.saveOnly) {
    logger.info('Plan saved only (--save-only). No transfer executed.');
    return;
  }

  logger.info('[Step 10] Loading agent profiles...');
  try {
    state.sourceProfile = await loadProfile(state.sourceAgent);
  } catch (e) {
    logger.warn(`Source profile for "${state.sourceAgent}" not found. Proceeding without profile.`);
  }
  try {
    state.targetProfile = await loadProfile(state.targetAgent);
  } catch (e) {
    logger.warn(`Target profile for "${state.targetAgent}" not found. Proceeding without profile.`);
  }

  await executeTransfer(state, outputPath);
}

async function executeFromPlan(planFile: string, saveOnly?: boolean): Promise<void> {
  const planPath = path.resolve(planFile);

  if (!await fs.pathExists(planPath)) {
    logger.error(`Plan file not found: ${planPath}`);
    return;
  }

  const content = await fs.readFile(planPath, 'utf-8');
  const plan = yaml.load(content) as TransportPlan;

  logger.info(`Executing from saved plan: ${planPath}`);
  logger.info(`Source: ${plan.source.agent} @ ${plan.source.userAtHost}:${plan.source.port}`);
  logger.info(`Target: ${plan.target.agent} @ ${plan.target.userAtHost}:${plan.target.port}`);

  if (saveOnly) {
    logger.info('--save-only specified. Plan validated, no transfer executed.');
    return;
  }

  let sourceProfile: Profile | undefined;
  let targetProfile: Profile | undefined;

  try {
    sourceProfile = await loadProfile(plan.source.agent);
  } catch (e) {
    logger.warn(`Source profile for "${plan.source.agent}" not found.`);
  }
  try {
    targetProfile = await loadProfile(plan.target.agent);
  } catch (e) {
    logger.warn(`Target profile for "${plan.target.agent}" not found.`);
  }

  const state: TransportWizardState = {
    sourceAgent: plan.source.agent,
    sourceUserAtHost: plan.source.userAtHost,
    sourcePackPath: plan.source.packPath,
    sourcePort: plan.source.port,
    targetAgent: plan.target.agent,
    targetUserAtHost: plan.target.userAtHost,
    targetPackPath: plan.target.packPath,
    targetPort: plan.target.port,
    outputPath: '',
    skipCheck: true,
    saveOnly: false,
    sourceProfile,
    targetProfile,
  };

  await executeTransfer(state, planPath);
}

async function executeTransfer(state: TransportWizardState, planPath: string): Promise<void> {
  const hasCli = state.sourceProfile && hasCliSession(state.sourceProfile);

  if (!hasCli) {
    logger.warn(`Source agent "${state.sourceAgent}" has no CLI pipe mode.`);
    logger.info('Falling back to file-copy mode.');
    logger.info('Please manually start your agent and read the packing instructions.');
    logger.info('astp will monitor for bundle completion...');
    logger.info('');
    logger.info('Manual steps:');
    logger.info('  1. Start your agent session on the source host');
    logger.info(`  2. Read the packing instructions (packys.md)`);
    logger.info('  3. Complete the packing flow to generate .astp-bundle/');
    logger.info('');

    const tmpDir = path.join(os.tmpdir(), `astp-session-${Date.now()}`);
    await fs.ensureDir(tmpDir);
    logger.info(`Session materials saved locally at: ${tmpDir}`);
    logger.info(`Transport plan at: ${planPath}`);
    logger.info('');
    logger.info('To resume after manual packing:');
    logger.info(`  astp transport --plan ${planPath}`);
    return;
  }

  logger.info('[Step 11] Launching source agent packing session via SSH...');

  const remoteSessionDir = '/tmp/astp-session';

  const projectRoot = ADAPTERS_DIR.replace(/\/adapters$/, '');
  const packysPath = path.join(projectRoot, 'packys_en.md');
  const targetProfilePath = getAdapterProfilePath(state.targetAgent);
  const sourceConfigPath = getAdapterConfigPath(state.sourceAgent);

  const sessionResult = await launchSourceSession({
    sourceProfile: state.sourceProfile!,
    targetProfile: state.targetProfile!,
    sourceUserAtHost: state.sourceUserAtHost,
    sourcePort: state.sourcePort,
    sourcePackPath: state.sourcePackPath,
    localPackysPath: packysPath,
    localTargetProfilePath: targetProfilePath,
    localSourceConfigPath: sourceConfigPath,
    remoteSessionDir,
  });

  if (!sessionResult.success) {
    logger.error(`Source session failed: ${sessionResult.error}`);
    logger.info(`Transport plan saved at: ${planPath}`);
    logger.info('Fix the issue and re-run: astp transport --plan <plan_path>');
    return;
  }

  logger.info('[Step 11] Source session completed successfully.');

  const localTmpDir = path.join(os.tmpdir(), `astp-${Date.now()}`);

  logger.info('[Step 12] Packing bundle as zip on source host and collecting...');
  const localZipPath = await collectBundleAsZip({
    sourceUserAtHost: state.sourceUserAtHost,
    sourcePort: state.sourcePort,
    sourcePackPath: state.sourcePackPath,
    localOutputDir: localTmpDir,
  });

  if (!localZipPath) {
    logger.error('Failed to collect bundle from source host.');
    logger.info(`Transport plan saved at: ${planPath}`);
    return;
  }

  logger.info(`Bundle zip collected at: ${localZipPath}`);

  const zipSize = (await fs.stat(localZipPath)).size;
  logger.info(`Zip size: ${(zipSize / 1024).toFixed(1)} KB`);

  const decision = await promptTransferDecision();

  if (decision === 'save_only') {
    logger.info(`Bundle zip saved locally at: ${localZipPath}`);
    logger.info(`Transport plan saved at: ${planPath}`);
    logger.info('');
    logger.info('To transfer later:');
    logger.info(`  astp transport --plan ${planPath}`);
    logger.info(`  Or manually: scp ${localZipPath} ${state.targetUserAtHost}:${state.targetPackPath}/`);
    return;
  }

  logger.info('[Step 12] Transferring zip to target host...');
  const remoteZipPath = await transferZipToTarget(
    localZipPath,
    state.targetUserAtHost,
    state.targetPort,
    state.targetPackPath,
  );

  if (remoteZipPath) {
    logger.info('Transfer complete.');
    logger.info('');
    logger.info(`Next step: On the target host, start a ${state.targetAgent} session and tell it:`);
    logger.info(`  Read the ASTP bundle zip at: ${remoteZipPath}`);
    logger.info(`  The agent should unzip it and execute adaptys.md to inject the transferred soul.`);
  } else {
    logger.error('Transfer to target failed. Bundle zip retained locally.');
    logger.info(`Local zip: ${localZipPath}`);
    logger.info(`Transport plan: ${planPath}`);
  }
}

function validatePort(value: string): true | string {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return 'Port must be an integer between 1 and 65535.';
  }
  return true;
}

function parsePort(value: string | undefined, defaultPort: number): number {
  if (!value) return defaultPort;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultPort;
}

function printCheckSummary(role: 'source' | 'target', result: EndpointCheckResult): void {
  logger.info(`[${role}] ${result.endpoint.agent} @ ${result.endpoint.userAtHost}`);
  logger.info(`[${role}] connectivity: ${result.connectivity}`);
  logger.info(`[${role}] path: ${result.pathStatus} (${result.pathCheck.checkedPath})`);

  if (result.issues.length === 0) {
    logger.info(`[${role}] checks passed`);
    return;
  }

  for (const issue of result.issues) {
    logger.warn(`[${role}] ${issue.type}: ${issue.message}`);
    logger.warn(`[${role}] suggestion: ${issue.suggestion}`);
  }
}