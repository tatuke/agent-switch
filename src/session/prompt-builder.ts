import type { Profile } from '../soul/schema.js';

export function buildPackPrompt(sourceProfile: Profile, targetProfile: Profile, sessionDir: string): string {
  const targetProfileFile = `${targetProfile.agent}_profile.json`;

  return `[ASTP Pack Session]

You are being invoked by ASTP (Agent Soul Transfer Protocol) for a packing session.

Read the following files carefully and follow their instructions:
1. ${sessionDir}/packys.md — Your packing instructions
2. ${sessionDir}/${targetProfileFile} — Target agent (${targetProfile.agent}) capability profile

Execute the packing flow defined in packys.md, including generation of customized adaptys.md based on the target profile.

Output everything to .astp-bundle/ directory in your current working directory.

When you have completed all steps and .astp-bundle/manifest.yaml is written, your session is complete.`;
}

function shellEscape(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export function buildCliCommand(profile: Profile, prompt: string): string {
  const command = profile.session_launch.command;
  const pipeMode = profile.session_launch.pipe_mode;

  if (!command) {
    throw new Error(`Agent ${profile.agent} has no CLI command configured`);
  }

  if (!pipeMode) {
    throw new Error(`Agent ${profile.agent} has no pipe mode configured. Use file-copy mode instead.`);
  }

  const escapedPrompt = shellEscape(prompt);

  if (pipeMode === 'exec') {
    return `${command} exec '${escapedPrompt}'`;
  }

  return `${command} ${pipeMode} '${escapedPrompt}'`;
}