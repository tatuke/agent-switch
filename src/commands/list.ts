import { getSoulPath, SOULS_DIR } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { deserializeSoul, type Soul } from '../soul/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function listSouls(): Promise<void> {
  if (!await fs.pathExists(SOULS_DIR)) {
    logger.info('No souls found. Use `astp extract` or `astp onboard` to create one.');
    return;
  }

  const files = await fs.readdir(SOULS_DIR);
  const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  if (yamlFiles.length === 0) {
    logger.info('No souls found. Use `astp extract` or `astp onboard` to create one.');
    return;
  }

  logger.info(`Found ${yamlFiles.length} soul(s):\n`);

  for (const file of yamlFiles) {
    const filePath = path.join(SOULS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      const soul = deserializeSoul(content);
      console.log(`  ${soul.identity.name}`);
      console.log(`    Role: ${soul.identity.role}`);
      console.log(`    Source: ${soul.metadata.source_agent}`);
      console.log(`    Created: ${soul.metadata.created}`);
      console.log(`    Memories: ${soul.memories.entries.length} entries`);
      console.log(`    Skills: ${soul.skills_package.packages.length} packages`);
      console.log();
    } catch {
      console.log(`  ${file} (invalid format)`);
      console.log();
    }
  }
}
