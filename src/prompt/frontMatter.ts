import { parse } from 'yaml';
import type { PromptModule, PromptModuleFrontMatter } from './types';

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

export function parseTextModule(raw: string): PromptModule {
  const match = raw.match(FRONTMATTER_REGEX);
  if (!match) {
    const preview = raw.slice(0, 80).replace(/\n/g, '\\n');
    throw new Error(`Prompt module missing YAML front matter: ${preview}`);
  }

  const [, yamlBlock, body] = match;
  const meta = (parse(yamlBlock) ?? {}) as PromptModuleFrontMatter;
  if (!meta.id) {
    throw new Error('Prompt module missing id in front matter');
  }

  return {
    id: meta.id,
    content: body.trim(),
    meta: {
      id: meta.id,
      order: meta.order ?? 100,
      dedupe_key: meta.dedupe_key ?? meta.id,
      inject_as: meta.inject_as ?? 'body',
      min_intensity: meta.min_intensity,
      max_intensity: meta.max_intensity,
      openness_in: meta.openness_in,
      require_vulnerability: meta.require_vulnerability,
      require_tech_block: meta.require_tech_block,
      require_save_memory: meta.require_save_memory,
      flags_any: meta.flags_any,
    },
  };
}
