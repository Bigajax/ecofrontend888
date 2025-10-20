import { HeuristicsRolloutMode } from '../types';

export const HEURISTICS_HALF_LIFE_DEFAULT_S = 20 * 60; // 20 minutes
export const HEURISTICS_MIN_SCORE_DEFAULT = 0.35;
export const HEURISTICS_COOLDOWN_TURNS_DEFAULT = 2;
export const HEURISTICS_SIGNAL_TTL_DEFAULT_S = 30 * 60; // 30 minutes as generic freshness window

export const LN2 = Math.log(2);

export const HEURISTICS_ROLLOUT_DEFAULT: HeuristicsRolloutMode = 'enabled';
