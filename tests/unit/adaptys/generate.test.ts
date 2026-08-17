import { describe, it, expect } from 'vitest';
import { generateAdaptys } from '../../../src/adaptys/generate.js';
import { loadProfile } from '../../../src/adaptys/profile-loader.js';
import * as fs from 'fs-extra';
import path from 'path';

describe('generateAdaptys', () => {
  it('should generate adaptys.md and adaptys-meta.yaml', async () => {
    const source = await loadProfile('opencode', 'tests/fixtures/adaptys');
    const target = await loadProfile('claude-code', 'tests/fixtures/adaptys');
    const templatePath = path.resolve('adaptys_en.md');

    const outputDir = path.join(process.env.TMPDIR || '/tmp', 'astp-test-generate');
    await fs.ensureDir(outputDir);

    const result = await generateAdaptys({
      sourceProfile: source,
      targetProfile: target,
      templatePath,
      outputDir,
    });

    expect(result.adaptysMdPath).toContain('adaptys.md');
    expect(result.adaptysMetaPath).toContain('adaptys-meta.yaml');

    const metaContent = await fs.readFile(result.adaptysMetaPath, 'utf-8');
    expect(metaContent).toContain('opencode');
    expect(metaContent).toContain('claude-code');

    const mdContent = await fs.readFile(result.adaptysMdPath, 'utf-8');
    expect(mdContent).toContain('Pre-computed Baseline');

    await fs.remove(outputDir);
  });
});