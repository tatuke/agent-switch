import type { CompatibilityEntry } from '../soul/schema.js';

export function injectPrecomputedBaseline(
  template: string,
  sourceAgent: string,
  targetAgent: string,
  matrix: Record<string, CompatibilityEntry>,
): string {
  const marker = '## Step 0: Compatibility Self-Assessment';

  const tableRows = Object.entries(matrix)
    .map(([category, entry]) => {
      const notes = entry.limitation || entry.degradation || 'Direct mapping';
      return `| ${category} | ${entry.suggested_mapping} | ${entry.match_level} | ${notes} |`;
    })
    .join('\n');

  const baselineSection = `${marker}

### Pre-computed Baseline (from source agent ${sourceAgent})

| Bundle Capability | Your Suggested Equivalent | Match Level | Notes |
|---|---|---|---|
${tableRows}

> **This is a suggested baseline.** Your actual capabilities may differ.
> Verify against your own tool inventory before proceeding.
> Mandatory items (signatures, resource refs, security patterns) must be preserved.
> Optional items (tool names, platform-specific features) are your decision.

### Your Task

1. Verify the pre-computed matrix against your actual capabilities
2. Mark discrepancies as: \`verified\`, \`discovered_upgrade\`, or \`target_changed\`
3. Proceed with Steps 1-8 below`;

  return template.replace(marker, baselineSection);
}