import { existsSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATE_MARKER = 'email-verification.hbs';

/** Resolves templates dir for bundled dist (`dist/templates`) and source (`src/assets/templates`). */
export function resolveMailTemplatesDir(fromDirname: string): string {
  const candidates = [
    join(fromDirname, 'templates'),
    join(fromDirname, '../../templates'),
    join(fromDirname, '../../assets/templates'),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, TEMPLATE_MARKER))) {
      return dir;
    }
  }

  throw new Error('Mail templates directory not found');
}
