import { deriveDecision } from './decision';
import type {
  ComposePromptOptions,
  ComposePromptResult,
  DerivedEcoDecision,
  EcoDecision,
  ModuleCandidateDebug,
  PromptModule,
} from './types';
import modulesRegistry from './registry';
import {
  createHeuristicsContext,
  evaluateHeuristicGate,
  finalizeHeuristicsLog,
} from './heuristics';

const DEFAULT_MODULES = modulesRegistry;

type ModuleBuckets = Record<'header' | 'body' | 'footer', string[]>;

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value === undefined || value === null ? '' : String(value);
}

function interpolate(content: string, dec: DerivedEcoDecision): string {
  return content.replace(/{{\s*DEC\.([a-zA-Z0-9_]+)\s*}}/g, (_, key: keyof DerivedEcoDecision) => {
    const value = dec[key];
    return formatValue(value);
  });
}

function evaluateModule(
  module: PromptModule,
  dec: DerivedEcoDecision,
  heuristicsContext: ReturnType<typeof createHeuristicsContext>,
): ModuleCandidateDebug {
  const reasonParts: string[] = [];
  let activated = true;
  let score: number | undefined;
  let threshold: number | undefined;

  if (module.meta.min_intensity !== undefined && dec.intensity < module.meta.min_intensity) {
    activated = false;
    reasonParts.push(`intensity<${module.meta.min_intensity}`);
  }

  if (activated && module.meta.max_intensity !== undefined && dec.intensity > module.meta.max_intensity) {
    activated = false;
    reasonParts.push(`intensity>${module.meta.max_intensity}`);
  }

  if (activated && module.meta.openness_in && !module.meta.openness_in.includes(dec.openness)) {
    activated = false;
    reasonParts.push('openness_mismatch');
  }

  if (activated && module.meta.require_vulnerability && !dec.isVulnerable) {
    activated = false;
    reasonParts.push('requires_vulnerability');
  }

  if (activated && module.meta.require_tech_block && !dec.hasTechBlock) {
    activated = false;
    reasonParts.push('requires_tech_block');
  }

  if (activated && module.meta.require_save_memory && !dec.saveMemory) {
    activated = false;
    reasonParts.push('requires_save_memory');
  }

  if (
    activated &&
    module.meta.flags_any &&
    module.meta.flags_any.length > 0 &&
    !module.meta.flags_any.some((flag) => dec.tags.includes(flag))
  ) {
    activated = false;
    reasonParts.push('flags_missing');
  }

  if (activated && module.meta.gate) {
    const gateResult = evaluateHeuristicGate(heuristicsContext, module.id, module.meta.gate);
    score = gateResult.score;
    threshold = gateResult.threshold;
    if (!gateResult.allowed) {
      activated = false;
      gateResult.suppressedBy.forEach((reason) => {
        reasonParts.push(`gate:${reason}`);
      });
    }
  }

  return {
    id: module.id,
    activated,
    reason: reasonParts.join(',') || 'matched',
    score,
    threshold,
  };
}

function applyDedupe(
  modules: PromptModule[],
  candidates: ModuleCandidateDebug[],
): { modules: PromptModule[]; candidates: ModuleCandidateDebug[] } {
  const usedKeys = new Set<string>();
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const deduped: PromptModule[] = [];

  for (const module of modules) {
    const key = module.meta.dedupe_key;
    if (key && usedKeys.has(key)) {
      const candidate = candidateMap.get(module.id);
      if (candidate) {
        candidate.activated = false;
        candidate.reason = `deduped:${key}`;
      }
      continue;
    }
    if (key) usedKeys.add(key);
    deduped.push(module);
  }

  return { modules: deduped, candidates };
}

function buildBuckets(modules: PromptModule[], dec: DerivedEcoDecision): ModuleBuckets {
  const buckets: ModuleBuckets = { header: [], body: [], footer: [] };
  modules.forEach((module) => {
    const bucket = module.meta.inject_as;
    const interpolated = interpolate(module.content, dec).trim();
    if (!interpolated) return;
    buckets[bucket].push(interpolated);
  });
  return buckets;
}

function assemblePrompt(buckets: ModuleBuckets): string {
  return [
    ...buckets.header,
    ...buckets.body,
    ...buckets.footer,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function composePrompt(decision: EcoDecision, options: ComposePromptOptions = {}): ComposePromptResult {
  const modules = options.modules ?? DEFAULT_MODULES;
  const dec = deriveDecision(decision);
  const heuristicsContext = createHeuristicsContext(dec);

  const candidates: ModuleCandidateDebug[] = modules.map((module) =>
    evaluateModule(module, dec, heuristicsContext),
  );
  const selected = modules
    .filter((module) => candidates.find((c) => c.id === module.id)?.activated)
    .sort((a, b) => a.meta.order - b.meta.order);

  const { modules: dedupedModules, candidates: dedupedCandidates } = applyDedupe(selected, candidates);

  const buckets = buildBuckets(dedupedModules, dec);
  const prompt = assemblePrompt(buckets);
  const selectedIds = dedupedModules.map((module) => module.id);

  const heuristicsLog = finalizeHeuristicsLog(heuristicsContext);
  dec.heuristicsLog = heuristicsLog;

  const debugEvent: ModuleDebugEvent = {
    type: 'ECO_MODULE_DEBUG',
    module_candidates: dedupedCandidates,
    selected_modules: selectedIds,
    dec,
    heuristics_eval: heuristicsLog,
  };

  options.onDebug?.(debugEvent);

  return {
    prompt,
    modules: dedupedModules,
    debug: debugEvent,
  };
}

export default composePrompt;
