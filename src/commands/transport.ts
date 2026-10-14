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
  type TransferMethod,
  type ProjectTransferConfig,
} from '../transport/index.js';
import { loadProfile, hasCliSession } from '../adaptys/index.js';
import type { Profile } from '../soul/schema.js';
import { launchSourceSession } from '../session/session-launcher.js';
import { collectBundleAsZip, transferZipToTarget, promptTransferDecision } from './transfer-bundle.js';
import { isValidTailcatAddress } from '../session/tailcat-exec.js';
import type { TransferChannel } from '../transport/index.js';

interface TransportWizardState {
  sourceAgent: string;
  sourceUserAtHost: string;
  sourcePackPath: string;
  sourcePort: number;
  channel: TransferChannel;
  sourceTailcatAddr: string;
  targetAgent: string;
  targetUserAtHost: string;
  targetPackPath: string;
  targetPort: number;
  targetTailcatAddr: string;
  outputPath: string;
  skipCheck: boolean;
  saveLocally: boolean;
  channelPreset?: boolean;
  planFile?: string;
  sourceProfile?: Profile;
  targetProfile?: Profile;
  projectConfig?: ProjectTransferConfig;
}

function parseChannelOption(value: string | undefined): TransferChannel | null {
  if (!value) return 'ssh';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ssh' || normalized === 'tailcat') return normalized;
  return null;
}

function printTailcatServeHelp(role: 'source' | 'target'): void {
  logger.info(`On the ${role} host, start a tailcat SSH server first (it prints a fresh tcXXX... address):`);
  logger.info('  tailcat serve ssh --ssh-authorized-keys=~/.ssh/authorized_keys');
  logger.info('  (or: tailcat serve no-auth-ssh — WARNING: the address grants shell access, share it privately only)');
  logger.info('Notes: the address is case-sensitive and expires when the serve process exits.');
}

export async function configureTransport(options: {
  plan?: string;
  planFile?: string;
  saveLocally?: boolean;
  skipCheck?: boolean;
  sourceAgent?: string;
  sourceHost?: string;
  sourcePath?: string;
  sourcePort?: string;
  channel?: string;
  sourceAddr?: string;
  targetAgent?: string;
  targetHost?: string;
  targetPath?: string;
  targetPort?: string;
  targetAddr?: string;
  output?: string;
}): Promise<void> {
  const planPath = options.plan || options.planFile;
  if (planPath) {
    await executeFromPlan(planPath);
    return;
  }

  const channelOption = parseChannelOption(options.channel);
  if (channelOption === null) {
    logger.error(`Invalid --channel value: "${options.channel}". Use "ssh" or "tailcat".`);
    return;
  }
  // An address flag implies the tailcat channel even when --channel is omitted.
  const channel: TransferChannel = channelOption === 'ssh' && (options.sourceAddr || options.targetAddr)
    ? 'tailcat'
    : channelOption;

  const state: TransportWizardState = {
    sourceAgent: options.sourceAgent || '',
    sourceUserAtHost: options.sourceHost || '',
    sourcePackPath: options.sourcePath || '',
    sourcePort: parsePort(options.sourcePort, DEFAULT_SSH_PORT),
    channel,
    sourceTailcatAddr: options.sourceAddr || '',
    targetAgent: options.targetAgent || '',
    targetUserAtHost: options.targetHost || '',
    targetPackPath: options.targetPath || '',
    targetPort: parsePort(options.targetPort, DEFAULT_SSH_PORT),
    targetTailcatAddr: options.targetAddr || '',
    outputPath: options.output || '',
    skipCheck: options.skipCheck || false,
    saveLocally: options.saveLocally || false,
    channelPreset: Boolean(options.channel) || Boolean(options.sourceAddr || options.targetAddr),
  };

  logger.info('=== ASTP Transport Wizard ===');
  logger.info('Step-by-step guided configuration. Press Ctrl+C to cancel at any time.');

  if (!state.saveLocally && !state.targetAgent && !state.targetUserAtHost && !state.targetTailcatAddr) {
    await step0_selectMode(state);
  }

  await step05_selectChannel(state);
  await step1_selectSourceAgent(state);
  if (!state.saveLocally) {
    await step2_selectTargetAgent(state);
  }
  await step3_enterSourceEndpoint(state);
  await step4_enterSourcePackPath(state);
  if (!state.saveLocally) {
    await step5_enterTargetEndpoint(state);
    await step6_enterTargetPackPath(state);
  }
  await step7_connectivityTest(state);
  const confirmed = await step8_previewAndEdit(state);
  if (!confirmed) {
    logger.info('Transport plan cancelled.');
    return;
  }
  await step85_projectMigration(state);
  await step10_executeOrSave(state);
}

async function step0_selectMode(state: TransportWizardState): Promise<void> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '[Step 0] What do you want to do?',
      choices: [
        { name: 'Save locally (backup)', value: 'save_locally' },
        { name: 'Transfer to another machine', value: 'transfer' },
      ],
    },
  ]);

  state.saveLocally = mode === 'save_locally';
  logger.info(`[Step 0] Mode: ${state.saveLocally ? 'Save locally' : 'Transfer to target'}`);
}

async function step05_selectChannel(state: TransportWizardState): Promise<void> {
  if (state.channelPreset) {
    logger.info(`[Step 0.5] Transfer channel: ${state.channel} (from flags)`);
    return;
  }

  const { channel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'channel',
      message: '[Step 0.5] How do you reach the remote hosts?',
      choices: [
        { name: 'SSH — user@host, key-based auth, port 22', value: 'ssh' },
        { name: 'tailcat — tcXXX address, no SSH keys, NAT traversal (github.com/tailscale/tailcat)', value: 'tailcat' },
      ],
    },
  ]);

  state.channel = channel as TransferChannel;
  logger.info(`[Step 0.5] Channel: ${state.channel}`);
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
  if (state.channel === 'tailcat') {
    if (state.sourceTailcatAddr) {
      logger.info(`[Step 3] Source tailcat address: ${state.sourceTailcatAddr} (from flags)`);
      return;
    }

    logger.info('[Step 3] Source reachable via tailcat.');
    printTailcatServeHelp('source');

    const { sourceTailcatAddr } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sourceTailcatAddr',
        message: '[Step 3] Source tailcat address (tcXXX...):',
        validate: (v: string) => isValidTailcatAddress(v.trim())
          ? true
          : 'Invalid tailcat address. Paste the full address printed by `tailcat serve` (starts with `tc`, case-sensitive).',
      },
    ]);

    state.sourceTailcatAddr = sourceTailcatAddr.trim();
    return;
  }

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
          return 'Must use format user@host (e.g., alice@203.0.113.5).';
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
  if (state.channel === 'tailcat') {
    if (state.targetTailcatAddr) {
      logger.info(`[Step 5] Target tailcat address: ${state.targetTailcatAddr} (from flags)`);
      return;
    }

    logger.info('[Step 5] Target reachable via tailcat.');
    printTailcatServeHelp('target');

    const { targetTailcatAddr } = await inquirer.prompt([
      {
        type: 'input',
        name: 'targetTailcatAddr',
        message: '[Step 5] Target tailcat address (tcXXX...):',
        validate: (v: string) => isValidTailcatAddress(v.trim())
          ? true
          : 'Invalid tailcat address. Paste the full address printed by `tailcat serve` (starts with `tc`, case-sensitive).',
      },
    ]);

    state.targetTailcatAddr = targetTailcatAddr.trim();
    return;
  }

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
          return 'Must use format user@host (e.g., bob@198.51.100.10).';
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
    channel: state.channel,
    tailcatAddr: state.channel === 'tailcat' ? state.sourceTailcatAddr : undefined,
  };

  const target: TransferEndpoint = {
    agent: state.targetAgent,
    userAtHost: state.targetUserAtHost,
    packPath: state.targetPackPath,
    port: state.targetPort,
    channel: state.channel,
    tailcatAddr: state.channel === 'tailcat' ? state.targetTailcatAddr : undefined,
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
          { name: 'Save plan only (fix errors later)', value: 'save_plan' },
          { name: 'Edit parameters and retry', value: 'edit' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'save_plan') {
      const { planPath: savedPath } = await buildAndSavePlan(state);
      logger.info(`Plan saved: ${savedPath}`);
      logger.info('Fix the errors and re-run: astp transport --plan <plan_path>');
      return;
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

function truncateForTable(value: string, width: number): string {
  return value.length > width ? `${value.substring(0, width - 3)}...` : value.padEnd(width);
}

async function step8_previewAndEdit(state: TransportWizardState): Promise<boolean> {
  const isTailcat = state.channel === 'tailcat';
  const sourceEndpoint = isTailcat ? `tailcat:${state.sourceTailcatAddr}` : state.sourceUserAtHost;
  const targetEndpoint = isTailcat ? (state.saveLocally ? '(local backup)' : `tailcat:${state.targetTailcatAddr}`) : state.targetUserAtHost;

  logger.info('[Step 8] Transport Plan Preview:');
  logger.info('');
  logger.info('  | Field         | Source                    | Target                    |');
  logger.info('  |---------------|---------------------------|---------------------------|');
  logger.info(`  | Agent         | ${truncateForTable(state.sourceAgent, 25)} | ${truncateForTable(state.targetAgent, 25)} |`);
  logger.info(`  | Channel       | ${state.channel.padEnd(25)} | ${''.padEnd(25)} |`);
  logger.info(`  | Endpoint      | ${truncateForTable(sourceEndpoint, 25)} | ${truncateForTable(targetEndpoint, 25)} |`);
  if (!isTailcat) {
    logger.info(`  | SSH Port      | ${String(state.sourcePort).padEnd(25)} | ${String(state.targetPort).padEnd(25)} |`);
  }
  logger.info(`  | Pack Path     | ${truncateForTable(state.sourcePackPath, 25)} | ${truncateForTable(state.targetPackPath, 25)} |`);
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
    const editChoices = [
      'sourceAgent',
      'sourcePackPath',
      'targetAgent',
      'targetPackPath',
      'channel',
      ...(state.channel === 'tailcat'
        ? ['sourceTailcatAddr', 'targetTailcatAddr']
        : ['sourceUserAtHost', 'sourcePort', 'targetUserAtHost', 'targetPort']),
    ];

    const { editField: fieldToEdit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editField',
        message: 'Which field to edit?',
        choices: editChoices,
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
    case 'channel': {
      const { channel } = await inquirer.prompt([
        {
          type: 'list',
          name: 'channel',
          message: 'New transfer channel:',
          choices: [
            { name: 'SSH — user@host, key-based auth', value: 'ssh' },
            { name: 'tailcat — tcXXX address, no SSH keys', value: 'tailcat' },
          ],
        },
      ]);
      state.channel = channel as TransferChannel;
      state.sourceUserAtHost = '';
      state.sourceTailcatAddr = '';
      state.targetUserAtHost = '';
      state.targetTailcatAddr = '';
      break;
    }
    case 'sourceTailcatAddr': {
      const { sourceTailcatAddr } = await inquirer.prompt([
        {
          type: 'input',
          name: 'sourceTailcatAddr',
          message: 'New source tailcat address (tcXXX...):',
          default: state.sourceTailcatAddr,
          validate: (v: string) => isValidTailcatAddress(v.trim()) ? true : 'Invalid tailcat address.',
        },
      ]);
      state.sourceTailcatAddr = sourceTailcatAddr.trim();
      break;
    }
    case 'targetTailcatAddr': {
      const { targetTailcatAddr } = await inquirer.prompt([
        {
          type: 'input',
          name: 'targetTailcatAddr',
          message: 'New target tailcat address (tcXXX...):',
          default: state.targetTailcatAddr,
          validate: (v: string) => isValidTailcatAddress(v.trim()) ? true : 'Invalid tailcat address.',
        },
      ]);
      state.targetTailcatAddr = targetTailcatAddr.trim();
      break;
    }
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

async function step85_projectMigration(state: TransportWizardState): Promise<void> {
  logger.info('[Step 8.5] Project workspace migration...');
  logger.info('You can also migrate the project-level context from your workspace (AGENTS.md, .cursor/rules/, specs/, etc.).');

  const { migrateProjects } = await inquirer.prompt([
    {
      type: 'list',
      name: 'migrateProjects',
      message: 'Migrate project workspace context along with the agent soul?',
      choices: [
        { name: 'Yes — scan workspace and include project context', value: 'yes' },
        { name: 'No — only transfer agent soul (identity, rules, tools)', value: 'no' },
      ],
    },
  ]);

  if (migrateProjects !== 'yes') {
    logger.info('[Step 8.5] Project migration: Skipped');
    return;
  }

  const defaultWorkspace = os.homedir() + '/projects';
  const { workspaceRoot } = await inquirer.prompt([
    {
      type: 'input',
      name: 'workspaceRoot',
      message: 'Workspace root path on source machine:',
      default: defaultWorkspace,
      validate: (v: string) => v.trim().length > 0 ? true : 'Path is required.',
    },
  ]);

  const { preferredMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'preferredMethod',
      message: 'Preferred code transfer method for projects:',
      choices: [
        { name: 'Git link only — target clones from git remote (lightweight)', value: 'git_link' },
        { name: 'Zip transfer — compress and SCP project code', value: 'zip' },
        { name: 'GitHub — push to GitHub, target clones from there', value: 'github' },
      ],
    },
  ]);

  state.projectConfig = {
    enabled: true,
    workspace_root: workspaceRoot.trim(),
    preferred_method: preferredMethod as TransferMethod,
    selected_projects: [],
  };

  logger.info(`[Step 8.5] Project migration enabled:`);
  logger.info(`  Workspace root: ${state.projectConfig.workspace_root}`);
  logger.info(`  Preferred method: ${state.projectConfig.preferred_method}`);
  logger.info(`  The source agent will scan for projects and prompt for per-project transfer decisions.`);
}

async function buildAndSavePlan(state: TransportWizardState): Promise<{ planPath: string }> {
  const source: TransferEndpoint = {
    agent: state.sourceAgent,
    userAtHost: state.sourceUserAtHost,
    packPath: state.sourcePackPath,
    port: state.sourcePort,
    channel: state.channel,
    tailcatAddr: state.channel === 'tailcat' ? state.sourceTailcatAddr : undefined,
  };

  const target: TransferEndpoint = {
    agent: state.targetAgent,
    userAtHost: state.targetUserAtHost,
    packPath: state.targetPackPath,
    port: state.targetPort,
    channel: state.channel,
    tailcatAddr: state.channel === 'tailcat' ? state.targetTailcatAddr : undefined,
  };

  let validation: TransportPlan['validation'];

  if (state.skipCheck) {
    validation = { skipped: true };
  } else {
    const sourceCheck = await checkEndpoint(source, 'source');
    if (state.saveLocally) {
      validation = { source: sourceCheck, target: { endpoint: source, parsedTarget: { user: '', host: '' }, connectivity: 'ok', pathStatus: 'ok', issues: [], pathCheck: { status: 'ok', message: 'Skipped (local backup)', checkedPath: '', exists: null, issueType: null } } };
    } else {
      const targetCheck = await checkEndpoint(target, 'target');
      validation = { source: sourceCheck, target: targetCheck };
    }
  }

  const plan: TransportPlan = {
    version: state.channel === 'tailcat' ? '1.2' : state.projectConfig?.enabled ? '1.1' : '1.0',
    created_at: new Date().toISOString(),
    source,
    target: state.saveLocally ? { ...source, agent: '(local backup)' } : target,
    projects: state.projectConfig?.enabled ? state.projectConfig : undefined,
    validation,
  };

  const planName = state.saveLocally
    ? buildDefaultTransportPlanName(source.agent, 'local-backup')
    : buildDefaultTransportPlanName(source.agent, target.agent);

  const outputPath = path.resolve(
    state.outputPath || getTransferPlanPath(planName),
  );

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, yaml.dump(plan, { indent: 2, lineWidth: -1 }), 'utf-8');

  return { planPath: outputPath };
}

async function step10_executeOrSave(state: TransportWizardState): Promise<void> {
  const { planPath: outputPath } = await buildAndSavePlan(state);

  logger.info(`[Step 10] Transport plan saved: ${outputPath}`);

  logger.info('[Step 10] Loading agent profiles...');
  try {
    state.sourceProfile = await loadProfile(state.sourceAgent);
  } catch (e) {
    logger.warn(`Source profile for "${state.sourceAgent}" not found. Proceeding without profile.`);
  }
  if (!state.saveLocally) {
    try {
      state.targetProfile = await loadProfile(state.targetAgent);
    } catch (e) {
      logger.warn(`Target profile for "${state.targetAgent}" not found. Proceeding without profile.`);
    }
  }

  await executeTransfer(state, outputPath);
}

async function executeFromPlan(planFile: string): Promise<void> {
  const planPath = path.resolve(planFile);

  if (!await fs.pathExists(planPath)) {
    logger.error(`Plan file not found: ${planPath}`);
    return;
  }

  const content = await fs.readFile(planPath, 'utf-8');
  const plan = yaml.load(content) as TransportPlan;

  logger.info(`Executing from saved plan: ${planPath}`);
  const planChannel = plan.source.channel ?? 'ssh';
  if (planChannel === 'tailcat') {
    logger.info(`Source: ${plan.source.agent} via tailcat:${plan.source.tailcatAddr ?? '(missing address)'}`);
    logger.info(`Target: ${plan.target.agent} via tailcat:${plan.target.tailcatAddr ?? '(missing address)'}`);
  } else {
    logger.info(`Source: ${plan.source.agent} @ ${plan.source.userAtHost}:${plan.source.port}`);
    logger.info(`Target: ${plan.target.agent} @ ${plan.target.userAtHost}:${plan.target.port}`);
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
    channel: planChannel,
    sourceTailcatAddr: plan.source.tailcatAddr ?? '',
    targetAgent: plan.target.agent,
    targetUserAtHost: plan.target.userAtHost,
    targetPackPath: plan.target.packPath,
    targetPort: plan.target.port,
    targetTailcatAddr: plan.target.tailcatAddr ?? '',
    outputPath: '',
    skipCheck: true,
    saveLocally: plan.target.agent === '(local backup)',
    channelPreset: true,
    sourceProfile,
    targetProfile,
    projectConfig: plan.projects,
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
    if (state.projectConfig?.enabled) {
      logger.info('  NOTE: Project workspace migration is enabled.');
      logger.info(`  Workspace root: ${state.projectConfig.workspace_root}`);
      logger.info('  The agent will also scan and package project context files.');
      logger.info('');
    }

    const tmpDir = path.join(os.tmpdir(), `astp-session-${Date.now()}`);
    await fs.ensureDir(tmpDir);
    logger.info(`Session materials saved locally at: ${tmpDir}`);
    logger.info(`Transport plan at: ${planPath}`);
    logger.info('');
    logger.info('To resume after manual packing:');
    logger.info(`  astp transport --plan ${planPath}`);
    return;
  }

  logger.info(`[Step 11] Launching source agent packing session via ${state.channel}...`);

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
    channel: state.channel,
    sourceTailcatAddr: state.channel === 'tailcat' ? state.sourceTailcatAddr : undefined,
    sourcePackPath: state.sourcePackPath,
    localPackysPath: packysPath,
    localTargetProfilePath: targetProfilePath,
    localSourceConfigPath: sourceConfigPath,
    remoteSessionDir,
    projectConfig: state.projectConfig,
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
    channel: state.channel,
    sourceTailcatAddr: state.channel === 'tailcat' ? state.sourceTailcatAddr : undefined,
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

  if (state.projectConfig?.enabled) {
    logger.info('Project workspace context is included in this bundle.');
    logger.info('After transferring, the target agent should read adaptys_en.md "Project Context Import" section.');
  }

  const hasTarget = !state.saveLocally && state.targetUserAtHost && state.targetPackPath;

  if (!hasTarget) {
    logger.info('No target configured. Bundle saved locally (backup mode).');
    logger.info(`  ${localZipPath}`);
    logger.info(`Transport plan: ${planPath}`);
    return;
  }

  const decision = await promptTransferDecision();

  if (decision === 'save_locally') {
    logger.info(`Bundle zip saved locally at: ${localZipPath}`);
    logger.info(`Transport plan saved at: ${planPath}`);
    logger.info('');
    logger.info('To transfer later:');
    logger.info(`  astp transport --plan ${planPath}`);
    if (state.channel === 'tailcat') {
      logger.info(`  Or manually: tailcat cp ${localZipPath} ${state.targetTailcatAddr}:${state.targetPackPath}/`);
    } else {
      logger.info(`  Or manually: scp ${localZipPath} ${state.targetUserAtHost}:${state.targetPackPath}/`);
    }
    return;
  }

  logger.info('[Step 12] Transferring zip to target host...');
  const remoteZipPath = await transferZipToTarget({
    localZipPath,
    targetUserAtHost: state.targetUserAtHost,
    targetPort: state.targetPort,
    targetPackPath: state.targetPackPath,
    channel: state.channel,
    targetTailcatAddr: state.channel === 'tailcat' ? state.targetTailcatAddr : undefined,
  });

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
