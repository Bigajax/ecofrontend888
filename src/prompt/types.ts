export type EcoOpenness = 'fechado' | 'moderado' | 'aberto';

export const HEURISTIC_SIGNAL_NAMES = [
  'negation',
  'uncertainty',
  'urgency',
  'self_blame',
  'catastrophizing',
  'rumination',
  'people_pleasing',
  'perfectionism',
  'avoidance',
] as const;

export type HeuristicSignalName = (typeof HEURISTIC_SIGNAL_NAMES)[number];

export type BiasSignalSource = 'nlp' | 'pattern' | 'behavior';

export interface BiasSignal {
  score: number;
  source: BiasSignalSource;
  last_seen_at?: string | null;
  ttl_s?: number | null;
}

export interface BiasSignalState extends BiasSignal {
  last_seen_at: string | null;
  last_seen_ms: number | null;
  ttl_s: number | null;
}

export type BiasSignalMap = Record<HeuristicSignalName, BiasSignalState>;

export interface HeuristicGateMeta {
  signal: HeuristicSignalName;
  min?: number;
  half_life_s?: number;
  cooldown_turns?: number;
}

export type HeuristicsRolloutMode = 'disabled' | 'shadow' | 'enabled' | 'pilot';

export interface HeuristicsConfig {
  cooldowns?: Record<string, number | null | undefined> | null;
  default_min?: number | null;
  default_half_life_s?: number | null;
  default_cooldown_turns?: number | null;
  signal_half_life_s?: Partial<Record<HeuristicSignalName, number | null | undefined>> | null;
  evaluated_at?: string | null;
  mode?: HeuristicsRolloutMode | null;
}

export interface HeuristicsState {
  now: number;
  defaultMin: number;
  defaultHalfLife: number;
  defaultCooldownTurns: number;
  signalHalfLives: Partial<Record<HeuristicSignalName, number>>;
  cooldowns: Record<string, number>;
  mode: HeuristicsRolloutMode;
}

export interface HeuristicsLogEntry {
  signal: HeuristicSignalName;
  effective_score: number;
  opened_arms: string[];
  suppressed_by: Array<'cooldown' | 'low_score'>;
  raw_score: number;
  source: BiasSignalSource;
}

export interface EcoDecision {
  intensity: number;
  openness: EcoOpenness;
  isVulnerable: boolean;
  vivaSteps: string[];
  saveMemory: boolean;
  hasTechBlock: boolean;
  tags: string[];
  domain?: string;
  signals?: Partial<Record<HeuristicSignalName, unknown>> | null;
  heuristics?: HeuristicsConfig | null;
}

export interface DerivedEcoDecision extends EcoDecision {
  vivaStepsText: string;
  vivaStepsCount: number;
  opennessAdvice: string;
  biasSignals: BiasSignalMap;
  heuristicsState: HeuristicsState;
  heuristicsLog: HeuristicsLogEntry[];
}

export type PromptModuleInjection = 'header' | 'body' | 'footer';

export interface PromptModuleFrontMatter {
  id: string;
  min_intensity?: number;
  max_intensity?: number;
  openness_in?: EcoOpenness[];
  require_vulnerability?: boolean;
  require_tech_block?: boolean;
  require_save_memory?: boolean;
  flags_any?: string[];
  order?: number;
  dedupe_key?: string;
  inject_as?: PromptModuleInjection;
  gate?: HeuristicGateMeta;
}

export interface PromptModule {
  id: string;
  content: string;
  meta: Required<Omit<PromptModuleFrontMatter, 'min_intensity' | 'max_intensity' | 'openness_in' | 'require_vulnerability' | 'require_tech_block' | 'require_save_memory' | 'flags_any'>> & {
    min_intensity?: number;
    max_intensity?: number;
    openness_in?: EcoOpenness[];
    require_vulnerability?: boolean;
    require_tech_block?: boolean;
    require_save_memory?: boolean;
    flags_any?: string[];
    gate?: HeuristicGateMeta;
  };
}

export interface ModuleCandidateDebug {
  id: string;
  activated: boolean;
  reason: string;
  score?: number;
  threshold?: number;
}

export interface ModuleDebugEvent {
  type: 'ECO_MODULE_DEBUG';
  module_candidates: ModuleCandidateDebug[];
  selected_modules: string[];
  dec: DerivedEcoDecision;
  heuristics_eval?: HeuristicsLogEntry[];
}

export interface ComposePromptOptions {
  modules?: PromptModule[];
  onDebug?: (event: ModuleDebugEvent) => void;
}

export interface ComposePromptResult {
  prompt: string;
  modules: PromptModule[];
  debug: ModuleDebugEvent;
}
