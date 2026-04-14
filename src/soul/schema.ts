import { z } from 'zod';

export const MetadataSchema = z.object({
  created: z.string().datetime(),
  source_agent: z.string(),
  target_compatibility: z.array(z.string()),
});

export const IdentitySchema = z.object({
  name: z.string(),
  role: z.string(),
  about_me: z.string(),
});

export const SkillsPackageEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  content: z.string(),
});

export const SkillsPackageSchema = z.object({
  packages: z.array(SkillsPackageEntrySchema),
});

export const MemoriesEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  category: z.string(),
  weight: z.number().min(0).max(1),
  created: z.string().datetime(),
});

export const MemoriesSchema = z.object({
  type: z.enum(['full', 'curated', 'tagged']),
  entries: z.array(MemoriesEntrySchema),
});

export const AgentConfigSchema = z.record(z.unknown());

export const SoulSchema = z.object({
  version: z.literal('2.0'),
  metadata: MetadataSchema,
  identity: IdentitySchema,
  skills_package: SkillsPackageSchema,
  tools_full_text: z.string(),
  principles_full_text: z.string(),
  memories: MemoriesSchema,
  agent_config: z.record(AgentConfigSchema),
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type SkillsPackageEntry = z.infer<typeof SkillsPackageEntrySchema>;
export type SkillsPackage = z.infer<typeof SkillsPackageSchema>;
export type MemoriesEntry = z.infer<typeof MemoriesEntrySchema>;
export type Memories = z.infer<typeof MemoriesSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type Soul = z.infer<typeof SoulSchema>;
