import { execSync } from 'node:child_process'

export const name = 'astp-plugin'
export const inject = ['tools']

export const Config = {
  astpPath: { type: 'string', default: 'astp', description: 'ASTP CLI path' },
  defaultTimeout: { type: 'number', default: 300, description: 'Default timeout in seconds' },
}

function getAstpPath(config) {
  return config.astpPath || 'astp'
}

function execAstp(args, config, timeout) {
  const astpPath = getAstpPath(config)
  const cmd = `${astpPath} ${args.join(' ')}`
  const timeoutMs = (timeout || config.defaultTimeout || 300) * 1000
  
  try {
    return execSync(cmd, { 
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (error) {
    if (error.status !== null) {
      throw new Error(`ASTP command failed (exit code ${error.status}): ${error.stderr || error.message}`)
    }
    throw error
  }
}

export function apply(ctx, config) {
  // Tool 1: List supported agents
  ctx.tools.register({
    name: 'astp_list_agents',
    description: 'List all supported AI agent platforms in ASTP',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const supportedAgents = [
        'opencode',
        'claude-code', 
        'openclaw',
        'codex',
        'hermes',
        'gemini-cli',
        'cursor',
        'kiro'
      ]
      
      return `Supported AI Agent Platforms:\n${supportedAgents.map(a => `- ${a}`).join('\n')}\n\nTotal: ${supportedAgents.length} agents`
    },
  })

  // Tool 2: Transport agent soul
  ctx.tools.register({
    name: 'astp_transport',
    description: 'Transfer an AI agent soul from source to target. This is the core ASTP functionality.',
    parameters: {
      sourceAgent: { 
        type: 'string', 
        required: true, 
        description: 'Source agent name (e.g., opencode, claude-code, openclaw)' 
      },
      sourceHost: { 
        type: 'string', 
        required: true, 
        description: 'Source SSH endpoint in user@host format' 
      },
      sourcePath: { 
        type: 'string', 
        required: true, 
        description: 'Source bundle path on the source host' 
      },
      targetAgent: { 
        type: 'string', 
        required: false, 
        description: 'Target agent name (optional for save-locally mode)' 
      },
      targetHost: { 
        type: 'string', 
        required: false, 
        description: 'Target SSH endpoint in user@host format (optional for save-locally mode)' 
      },
      targetPath: { 
        type: 'string', 
        required: false, 
        description: 'Target bundle path on the target host (optional for save-locally mode)' 
      },
      saveLocally: { 
        type: 'boolean', 
        required: false, 
        description: 'If true, save bundle locally without transferring to target' 
      },
      skipCheck: { 
        type: 'boolean', 
        required: false, 
        description: 'Skip connectivity and path validation' 
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const astpArgs = ['transport']
      
      if (args.sourceAgent) astpArgs.push('--source-agent', args.sourceAgent)
      if (args.sourceHost) astpArgs.push('--source-host', args.sourceHost)
      if (args.sourcePath) astpArgs.push('--source-path', args.sourcePath)
      if (args.targetAgent) astpArgs.push('--target-agent', args.targetAgent)
      if (args.targetHost) astpArgs.push('--target-host', args.targetHost)
      if (args.targetPath) astpArgs.push('--target-path', args.targetPath)
      if (args.saveLocally) astpArgs.push('--save-locally')
      if (args.skipCheck) astpArgs.push('--skip-check')
      
      try {
        const result = execAstp(astpArgs, config)
        return result || 'Transport completed successfully'
      } catch (error) {
        return `Transport failed: ${error.message}`
      }
    },
  })

  // Tool 3: Validate soul file
  ctx.tools.register({
    name: 'astp_validate',
    description: 'Validate an ASTP soul YAML file',
    parameters: {
      soulPath: { 
        type: 'string', 
        required: true, 
        description: 'Path to the soul YAML file to validate' 
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      try {
        const result = execAstp(['validate', args.soulPath], config)
        return result || 'Soul file is valid'
      } catch (error) {
        return `Validation failed: ${error.message}`
      }
    },
  })

  // Tool 4: List available souls
  ctx.tools.register({
    name: 'astp_list_souls',
    description: 'List all available soul files in the ASTP storage',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      try {
        const result = execAstp(['list'], config)
        return result || 'No souls found'
      } catch (error) {
        return `Failed to list souls: ${error.message}`
      }
    },
  })

  // Tool 5: Get agent profile info
  ctx.tools.register({
    name: 'astp_agent_info',
    description: 'Get detailed information about a specific agent platform',
    parameters: {
      agentName: { 
        type: 'string', 
        required: true, 
        description: 'Agent name to get info for' 
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const agentProfiles = {
        'opencode': {
          cli: 'opencode',
          pipeMode: '-p',
          configLocation: '~/.config/opencode/AGENTS.md',
          support: 'Full'
        },
        'claude-code': {
          cli: 'claude',
          pipeMode: '-p',
          configLocation: '~/.claude/CLAUDE.md',
          support: 'Full'
        },
        'openclaw': {
          cli: 'openclaw',
          pipeMode: '--agent <id> -m --local',
          configLocation: '~/.openclaw/workspace/AGENTS.md',
          support: 'Full'
        },
        'codex': {
          cli: 'codex exec',
          pipeMode: 'exec',
          configLocation: '~/.codex/AGENTS.md',
          support: 'Full'
        },
        'hermes': {
          cli: 'hermes',
          pipeMode: '-z',
          configLocation: '~/.hermes/AGENTS.md',
          support: 'Full'
        },
        'gemini-cli': {
          cli: 'gemini',
          pipeMode: 'TBD',
          configLocation: '~/.gemini/GEMINI.md',
          support: 'Pending'
        },
        'cursor': {
          cli: 'No CLI',
          pipeMode: 'N/A',
          configLocation: './.cursor/rules/',
          support: 'File-copy only'
        },
        'kiro': {
          cli: 'No CLI',
          pipeMode: 'N/A',
          configLocation: './.kiro/steering/',
          support: 'File-copy only'
        }
      }

      const profile = agentProfiles[args.agentName.toLowerCase()]
      if (!profile) {
        return `Unknown agent: ${args.agentName}\n\nSupported agents: ${Object.keys(agentProfiles).join(', ')}`
      }

      return `Agent: ${args.agentName}\n` +
             `CLI Command: ${profile.cli}\n` +
             `Pipe Mode: ${profile.pipeMode}\n` +
             `Config Location: ${profile.configLocation}\n` +
             `Support Level: ${profile.support}`
    },
  })

  console.log('[astp-plugin] ASTP plugin loaded with 5 tools')
}
