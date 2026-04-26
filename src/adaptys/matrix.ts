import type { Profile, CapabilitySignature, CompatibilityEntry, MatchLevel } from '../soul/schema.js';

export function computeCompatibilityMatrix(source: Profile, target: Profile): Record<string, CompatibilityEntry> {
  const matrix: Record<string, CompatibilityEntry> = {};

  for (const [category, sourceSig] of Object.entries(source.capability_signatures)) {
    if (sourceSig === null) continue;

    const targetSig = target.capability_signatures[category];

    if (targetSig === undefined) {
      matrix[category] = {
        match_level: 'unknown' as MatchLevel,
        suggested_mapping: `N/A — target does not list this capability`,
        confidence: 'low',
        degradation: 'Ask target to self-assess',
      };
      continue;
    }

    if (targetSig === null) {
      matrix[category] = {
        match_level: 'gap' as MatchLevel,
        suggested_mapping: `N/A — target has no ${category} capability`,
        confidence: 'high',
        degradation: suggestDegradation(category),
      };
      continue;
    }

    const matchResult = compareSignatures(sourceSig, targetSig);

    matrix[category] = {
      match_level: matchResult.level,
      suggested_mapping: buildMappingHint(category, source, target),
      confidence: matchResult.confidence,
      limitation: matchResult.limitation,
    };
  }

  return matrix;
}

function compareSignatures(source: CapabilitySignature, target: CapabilitySignature): { level: MatchLevel; confidence: 'high' | 'medium' | 'low'; limitation?: string } {
  if (source === null || target === null) {
    return { level: 'gap', confidence: 'high' };
  }

  const targetConstraints = new Set(target.constraints);
  const sourceHasExtra = source.constraints.filter(c => !targetConstraints.has(c));

  const inputDiffers = source.input !== target.input;
  const outputDiffers = source.output !== target.output;

  if (!sourceHasExtra.length && !inputDiffers && !outputDiffers) {
    return { level: 'full', confidence: 'high' };
  }

  const limitations: string[] = [];
  if (sourceHasExtra.length) {
    limitations.push(`Target lacks constraints: ${sourceHasExtra.join(', ')}`);
  }
  if (inputDiffers) {
    limitations.push(`Input differs: source=${source.input}, target=${target.input}`);
  }
  if (outputDiffers) {
    limitations.push(`Output differs: source=${source.output}, target=${target.output}`);
  }

  return {
    level: 'partial',
    confidence: 'medium',
    limitation: limitations.join('; '),
  };
}

function buildMappingHint(category: string, source: Profile, target: Profile): string {
  const sourceTool = source.native_tools.find(t => t.toLowerCase().includes(category)) || category;
  const targetTool = target.native_tools.find(t => t.toLowerCase().includes(category)) || 'target equivalent';
  return `${sourceTool} → ${targetTool}`;
}

function suggestDegradation(category: string): string {
  const map: Record<string, string> = {
    search: 'Use filename glob search or manual directory traversal',
    read: 'Use shell commands (cat, head) as fallback',
    edit: 'Use write tool to overwrite entire file',
    execute: 'Request user to run commands manually',
    fetch: 'Ask user to provide content manually',
    diagnostics: 'Use shell diagnostic commands (ps, top, netstat)',
    preview: 'Use git diff via execute tool',
  };
  return map[category] || 'No degradation path available';
}