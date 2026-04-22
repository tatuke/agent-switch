#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { extractSoul } from './commands/extract.js';
import { injectSoul } from './commands/inject.js';
import { listSouls } from './commands/list.js';
import { validateSoulFile } from './commands/validate.js';
import { switchSoul } from './commands/switch.js';
import { editSoul } from './commands/edit.js';
import { onboardWizard } from './commands/onboard.js';
import { processBundle } from './commands/bundle.js';
import { configureTransport } from './commands/transport.js';

const program = new Command();

program
  .name('astp')
  .description('Agent Soul Transfer Protocol - Package and transfer AI agent identities')
  .version(version);

program
  .command('extract')
  .description('Extract a soul from an agent')
  .option('-f, --from <agent>', 'Source agent (opencode, claude-code, openclaw)')
  .option('-n, --name <name>', 'Name for the extracted soul')
  .option('-o, --output <path>', 'Output file path (optional)')
  .action(extractSoul);

program
  .command('inject')
  .description('Inject a soul into an agent')
  .option('-s, --soul <name>', 'Soul name or file path')
  .option('-i, --into <agent>', 'Target agent (opencode, claude-code, openclaw)')
  .action(injectSoul);

program
  .command('list')
  .description('List available souls')
  .action(listSouls);

program
  .command('validate')
  .description('Validate a soul file')
  .argument('<path>', 'Soul file path')
  .action(validateSoulFile);

program
  .command('switch')
  .description('Quick switch between agent souls')
  .argument('<soul>', 'Soul name or file path')
  .option('-t, --to <agent>', 'Target agent (optional, uses current if not specified)')
  .action(switchSoul);

program
  .command('edit')
  .description('Edit a soul interactively')
  .argument('<soul>', 'Soul name or file path')
  .action(editSoul);

program
  .command('onboard')
  .description('Interactive configuration wizard (Mode 2)')
  .option('-f, --from <agent>', 'Source agent')
  .option('-i, --into <agent>', 'Target agent')
  .action(onboardWizard);

program
  .command('bundle')
  .description('Process agent self-packaged bundle (Mode 1)')
  .option('--input <path>', 'Path to .astp-bundle directory')
  .option('--inject <agent>', 'Target agent to inject into')
  .action(processBundle);

program
  .command('transport')
  .description('Guided transport configuration wizard — step-by-step source/target setup')
  .option('--source-agent <name>', 'Source agent name (skips Step 1)')
  .option('--source-host <user@host>', 'Source SSH target (skips Step 3)')
  .option('--source-path <path>', 'Source packpath (skips Step 4)')
  .option('--source-port <port>', 'Source SSH port')
  .option('--target-agent <name>', 'Target agent name (skips Step 2)')
  .option('--target-host <user@host>', 'Target SSH target (skips Step 5)')
  .option('--target-path <path>', 'Target packpath (skips Step 6)')
  .option('--target-port <port>', 'Target SSH port')
  .option('-o, --output <path>', 'Output path for saved transport plan')
  .option('--skip-check', 'Skip connectivity and path validation')
  .option('--plan <path>', 'Execute from saved plan file (skip wizard)')
  .option('--save-only', 'Save plan without executing transfer')
  .action(configureTransport);

program.parse();
