import * as fs from 'fs-extra';
import path from 'path';
import { ProfileSchema, type Profile } from '../soul/schema.js';
import { ADAPTERS_DIR } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function loadProfile(agentName: string, baseDir?: string): Promise<Profile> {
  const dir = baseDir
    ? path.join(baseDir, agentName)
    : path.join(ADAPTERS_DIR, agentName);
  const profilePath = path.join(dir, 'profile.json');

  if (!await fs.pathExists(profilePath)) {
    throw new Error(`Profile not found for agent "${agentName}" at ${profilePath}`);
  }

  const raw = await fs.readJson(profilePath);
  const parsed = ProfileSchema.parse(raw);
  return parsed;
}

export async function listAvailableProfiles(baseDir?: string): Promise<string[]> {
  const dir = baseDir || ADAPTERS_DIR;

  if (!await fs.pathExists(dir)) {
    logger.warn(`Adapters directory not found: ${dir}`);
    return [];
  }

  const entries = await fs.readdir(dir);
  const profiles: string[] = [];

  for (const entry of entries) {
    const profilePath = path.join(dir, entry, 'profile.json');
    if (await fs.pathExists(profilePath)) {
      profiles.push(entry);
    }
  }

  return profiles;
}

export function hasCliSession(profile: Profile): boolean {
  return profile.session_launch.command !== null && profile.session_launch.pipe_mode !== null;
}