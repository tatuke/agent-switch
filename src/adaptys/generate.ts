import yaml from 'js-yaml';
import * as fs from 'fs-extra';
import path from 'path';
import type { Profile, AdaptysMeta, CompatibilityEntry, MandatoryItem } from '../soul/schema.js';
import { computeCompatibilityMatrix } from './matrix.js';
import { injectPrecomputedBaseline } from './template.js';
import { logger } from '../utils/logger.js';

interface GenerateAdaptysOptions {
  sourceProfile: Profile;
  targetProfile: Profile;
  templatePath: string;
  outputDir: string;
}

interface GenerateAdaptysResult {
  adaptysMdPath: string;
  adaptysMetaPath: string;
}

export async function generateAdaptys(options: GenerateAdaptysOptions): Promise<GenerateAdaptysResult> {
  const { sourceProfile, targetProfile, templatePath, outputDir } = options;

  const template = await fs.readFile(templatePath, 'utf-8');
  const matrix = computeCompatibilityMatrix(sourceProfile, targetProfile);
  const customizedMd = injectPrecomputedBaseline(template, sourceProfile.agent, targetProfile.agent, matrix);

  const adaptysMdPath = path.join(outputDir, 'adaptys.md');
  await fs.ensureDir(outputDir);
  await fs.writeFile(adaptysMdPath, customizedMd, 'utf-8');
  logger.info(`Generated: ${adaptysMdPath}`);

  const meta: AdaptysMeta = {
    version: '1.0',
    source_agent: sourceProfile.agent,
    target_agent: targetProfile.agent,
    generated_at: new Date().toISOString(),
    suggested_compatibility_matrix: matrix,
    mandatory_items: buildMandatoryItems(),
    optional_items: buildOptionalItems(sourceProfile, targetProfile),
    rule_injection_mapping: {
      source_rule_system: sourceProfile.rule_system,
      target_rule_system: targetProfile.rule_system,
    },
    tool_permission_mapping: {
      source_format: sourceProfile.tool_permissions.format,
      target_format: targetProfile.tool_permissions.format,
    },
  };

  const adaptysMetaPath = path.join(outputDir, 'adaptys-meta.yaml');
  await fs.writeFile(adaptysMetaPath, yaml.dump(meta, { indent: 2, lineWidth: -1 }), 'utf-8');
  logger.info(`Generated: ${adaptysMetaPath}`);

  return { adaptysMdPath, adaptysMetaPath };
}

function buildMandatoryItems(): MandatoryItem[] {
  return [
    { type: 'capability_signatures', description: 'All capability signatures from tools.md must be preserved — they are contracts', enforcement: 'target_must_preserve' },
    { type: 'resource_references', description: 'URLs, file paths, API endpoints, env var names in tool-map.md', enforcement: 'target_must_preserve' },
    { type: 'security_patterns', description: 'Security can only be strengthened, never weakened', enforcement: 'target_must_preserve_or_strictify' },
    { type: 'tool_mapping_hints', description: "Platform Mapping Hints guide self-mapping but don't prescribe tool names", enforcement: 'target_should_follow' },
  ];
}

function buildOptionalItems(source: Profile, target: Profile): MandatoryItem[] {
  return [
    { type: 'tool_names', description: `Source tool names (${source.native_tools.slice(0, 3).join(', ')}) — target uses its own names`, enforcement: 'target_decides' },
    { type: 'platform_specific_capabilities', description: "Capabilities the target natively has but source doesn't mention", enforcement: 'target_decides' },
    { type: 'rule_injection_format', description: `Source uses ${source.rule_system.global_file}; target uses ${target.rule_system.global_file} — target adapts format`, enforcement: 'target_adapts_to_own_format' },
    { type: 'hook_system', description: `Source uses ${source.hook_system.type}; target uses ${target.hook_system.type}`, enforcement: 'target_adapts_or_ignores' },
  ];
}