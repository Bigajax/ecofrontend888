export type EcoOpenness = 'fechado' | 'moderado' | 'aberto';

export interface EcoDecision {
  intensity: number;
  openness: EcoOpenness;
  isVulnerable: boolean;
  vivaSteps: string[];
  saveMemory: boolean;
  hasTechBlock: boolean;
  tags: string[];
  domain?: string;
}

export interface DerivedEcoDecision extends EcoDecision {
  vivaStepsText: string;
  vivaStepsCount: number;
  opennessAdvice: string;
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
