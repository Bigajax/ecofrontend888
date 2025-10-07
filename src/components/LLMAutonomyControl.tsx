import React, { useMemo } from 'react';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import mixpanel from '../lib/mixpanel';

interface LLMAutonomyControlProps {
  className?: string;
}

type AutonomyOption = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  value: number;
};

const AUTONOMY_OPTIONS: AutonomyOption[] = [
  {
    id: 'reflective',
    label: 'Suave',
    subtitle: 'Mais espaço',
    description:
      'Eco devolve mais perguntas e amplia o espaço para você elaborar com calma.',
    value: 0.25,
  },
  {
    id: 'balanced',
    label: 'Equilíbrio',
    subtitle: 'Padrão',
    description:
      'Mistura equilibrada entre perguntas, validações e pequenas sugestões.',
    value: 0.5,
  },
  {
    id: 'proactive',
    label: 'Ativa',
    subtitle: 'Mais diretiva',
    description:
      'Eco assume mais autonomia para sugerir caminhos, desafios e convites práticos.',
    value: 0.8,
  },
];

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const findClosestOption = (autonomy: number) => {
  const target = clamp(autonomy);
  return AUTONOMY_OPTIONS.reduce((best, option) => {
    const bestDiff = Math.abs(best.value - target);
    const optionDiff = Math.abs(option.value - target);
    return optionDiff < bestDiff ? option : best;
  });
};

const formatPercentage = (value: number) => `${Math.round(clamp(value) * 100)}%`;

const LLMAutonomyControl: React.FC<LLMAutonomyControlProps> = ({ className = '' }) => {
  const { autonomy, setAutonomy } = useLLMSettings();

  const activeOption = useMemo(() => findClosestOption(autonomy), [autonomy]);

  const handleSelect = (option: AutonomyOption) => {
    if (Math.abs(option.value - autonomy) < 0.01) return;
    setAutonomy(option.value);
    try {
      mixpanel.track('Eco: Ajuste Autonomia LLM', {
        autonomy_value: Number(option.value.toFixed(2)),
        autonomy_label: option.id,
      });
    } catch {}
  };

  return (
    <div className={`w-full ${className}`.trim()}>
      <div className="flex items-center justify-between mb-2">
        <span
          id="llm-autonomy-label"
          className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold"
        >
          Autonomia da Eco
        </span>
        <span className="text-[11px] text-slate-500">{formatPercentage(autonomy)}</span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="llm-autonomy-label"
        className="grid grid-cols-3 gap-1.5"
      >
        {AUTONOMY_OPTIONS.map((option) => {
          const selected = option.id === activeOption.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(option)}
              className={`
                group flex h-full flex-col items-start justify-center gap-0.5 rounded-2xl border px-3 py-2
                text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50
                ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]'
                    : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white focus-visible:ring-offset-1'
                }
              `}
              data-autonomy-id={option.id}
            >
              <span className="text-[13px] font-medium leading-none tracking-[-0.01em]">
                {option.label}
              </span>
              <span
                className={`text-[11px] leading-tight ${selected ? 'text-white/80' : 'text-slate-500'}`}
              >
                {option.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        {activeOption.description}
      </p>
    </div>
  );
};

export default LLMAutonomyControl;
