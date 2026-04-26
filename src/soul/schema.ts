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

export const StabilityEnum = z.enum(['experimental', 'beta', 'stable']);
export const CostClassEnum = z.enum(['light', 'medium', 'heavy']);
export const OriginEnum = z.enum(['ECC', 'community', 'custom']);

export const SkillsPackageEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  content: z.string(),
  dependencies: z.array(z.string()).default([]),
  stability: StabilityEnum.default('stable'),
  cost_class: CostClassEnum.default('medium'),
  origin: OriginEnum.default('custom'),
});

export const BundleMetadataSchema = z.object({
  stability: StabilityEnum.default('stable'),
  cost_class: CostClassEnum.default('medium'),
  origin: OriginEnum.default('custom'),
  dependencies: z.array(z.string()).default([]),
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

export const MatchLevelEnum = z.enum(['full', 'partial', 'gap', 'unknown']);
export const ConfidenceEnum = z.enum(['high', 'medium', 'low']);
export const EnforcementEnum = z.enum([
  'target_must_preserve',
  'target_must_preserve_or_strictify',
  'target_should_follow',
  'target_decides',
  'target_adapts_to_own_format',
  'target_adapts_or_ignores',
]);

export const CapabilitySignatureSchema = z.object({
  input: z.string(),
  output: z.string(),
  constraints: z.array(z.string()),
  match_note: z.string().optional(),
}).nullable();

export const SessionLaunchSchema = z.object({
  command: z.string().nullable(),
  pipe_mode: z.string().nullable(),
  working_directory: z.string().default('project_root'),
  timeout_seconds: z.number().default(600),
  note: z.string().optional(),
  output_detection: z.object({
    method: z.enum(['file_watch', 'process_exit']),
    path: z.string().default('.astp-bundle/manifest.yaml'),
    poll_interval_ms: z.number().default(5000),
  }).optional(),
});

export const ProfileSchema = z.object({
  agent: z.string(),
  version_range: z.string(),
  capability_signatures: z.record(CapabilitySignatureSchema),
  native_tools: z.array(z.string()),
  rule_system: z.object({
    type: z.string(),
    format: z.string(),
    global_file: z.string(),
    project_file: z.string().optional(),
    injection: z.string(),
  }),
  tool_permissions: z.object({
    type: z.string(),
    location: z.string(),
    format: z.string(),
  }),
  hook_system: z.object({
    type: z.string(),
    entry: z.string(),
  }),
  security_boundaries: z.record(z.boolean()),
  session_launch: SessionLaunchSchema,
});

export const CompatibilityEntrySchema = z.object({
  match_level: MatchLevelEnum,
  suggested_mapping: z.string(),
  confidence: ConfidenceEnum,
  limitation: z.string().optional(),
  degradation: z.string().optional(),
});

export const MandatoryItemSchema = z.object({
  type: z.string(),
  description: z.string(),
  enforcement: EnforcementEnum,
});

export const AdaptysMetaSchema = z.object({
  version: z.literal('1.0'),
  source_agent: z.string(),
  target_agent: z.string(),
  generated_at: z.string().datetime(),
  suggested_compatibility_matrix: z.record(CompatibilityEntrySchema),
  mandatory_items: z.array(MandatoryItemSchema),
  optional_items: z.array(MandatoryItemSchema),
  rule_injection_mapping: z.record(z.unknown()),
  tool_permission_mapping: z.record(z.string()),
});

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
export type StabilityEnum = z.infer<typeof StabilityEnum>;
export type CostClassEnum = z.infer<typeof CostClassEnum>;
export type OriginEnum = z.infer<typeof OriginEnum>;
export type BundleMetadata = z.infer<typeof BundleMetadataSchema>;
export type Soul = z.infer<typeof SoulSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type CapabilitySignature = z.infer<typeof CapabilitySignatureSchema>;
export type SessionLaunch = z.infer<typeof SessionLaunchSchema>;
export type CompatibilityEntry = z.infer<typeof CompatibilityEntrySchema>;
export type MatchLevel = z.infer<typeof MatchLevelEnum>;
export type AdaptysMeta = z.infer<typeof AdaptysMetaSchema>;
export type MandatoryItem = z.infer<typeof MandatoryItemSchema>;
