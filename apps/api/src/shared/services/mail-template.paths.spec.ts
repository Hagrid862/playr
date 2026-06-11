import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveMailTemplatesDir } from './mail-template.paths';

const thisDir = dirname(fileURLToPath(import.meta.url));

describe('resolveMailTemplatesDir', () => {
  it('should resolve templates from src/shared/services (vitest)', () => {
    const dir = resolveMailTemplatesDir(thisDir);

    expect(dir).toBe(join(thisDir, '../../assets/templates'));
  });

  it('should resolve templates from dist bundle root', () => {
    const distDir = join(thisDir, '../../..', 'dist');
    const distTemplates = join(distDir, 'templates', 'email-verification.hbs');

    if (!existsSync(distTemplates)) {
      return;
    }

    const dir = resolveMailTemplatesDir(distDir);

    expect(dir).toBe(join(distDir, 'templates'));
  });
});
