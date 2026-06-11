import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { resolveMailTemplatesDir } from './mail-template.paths';

@Injectable()
export class MailTemplateService implements OnModuleInit {
  private readonly templates = new Map<string, HandlebarsTemplateDelegate>();
  private readonly templatesDir = resolveMailTemplatesDir(import.meta.dirname);

  onModuleInit(): void {
    const partialsDir = join(this.templatesDir, 'partials');

    for (const file of readdirSync(partialsDir)) {
      if (!file.endsWith('.hbs')) continue;

      const partialName = file.replace(/\.hbs$/, '');
      Handlebars.registerPartial(partialName, readFileSync(join(partialsDir, file), 'utf8'));
    }

    for (const templateName of ['email-verification', 'password-reset']) {
      const source = readFileSync(join(this.templatesDir, `${templateName}.hbs`), 'utf8');
      this.templates.set(templateName, Handlebars.compile(source, { strict: true }));
    }
  }

  render(templateName: string, context: Record<string, unknown>): string {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Unknown mail template: ${templateName}`);
    }

    return template(context);
  }
}
