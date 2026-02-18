// src/components/subscription/PricingCard.tsx
// Card de plano de assinatura com seleção interativa

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PricingCardProps {
  plan: 'essentials' | 'monthly' | 'annual';
  name?: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
  billingPeriod: 'month' | 'year';
  trialDays?: number;
  isPopular?: boolean;
  features: string[];
  onSelect: () => void;
  isSelected: boolean;
  disabled?: boolean;
}

export default function PricingCard({
  plan,
  name,
  subtitle,
  price,
  originalPrice,
  billingPeriod,
  trialDays = 7,
  isPopular = false,
  features,
  onSelect,
  isSelected,
  disabled = false,
}: PricingCardProps) {
  const monthlyEquivalent = billingPeriod === 'year' ? price / 12 : price;
  const discountPercentage = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  // Determinar nome do plano
  const planName =
    name ||
    (plan === 'essentials'
      ? 'Plano Essentials'
      : plan === 'monthly'
      ? 'Plano Mensal'
      : 'Plano Anual');

  // Determinar descrição
  const planDescription =
    subtitle ||
    (billingPeriod === 'month' ? 'Renovação mensal' : 'Pagamento único anual');

  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={`
        relative w-full rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-left transition-all duration-300
        ${
          isSelected
            ? 'bg-[#6EC8FF]/10 border-2 border-[#6EC8FF] shadow-[0_0_20px_rgba(110,200,255,0.3)]'
            : 'bg-white/50 border-2 border-[var(--eco-line)] hover:border-[#6EC8FF]/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        backdrop-blur-md
      `}
    >
      {/* Badge "MAIS POPULAR" */}
      {isPopular && (
        <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] rounded-full shadow-md">
          <span className="text-[10px] sm:text-xs font-semibold text-white uppercase tracking-wide">
            Mais Popular
          </span>
        </div>
      )}

      {/* Checkmark quando selecionado */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#6EC8FF] flex items-center justify-center"
        >
          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
        </motion.div>
      )}

      {/* Header do Plano */}
      <div className="mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--eco-text)] mb-1">
          {planName}
        </h3>
        <p className="text-xs sm:text-sm text-[var(--eco-muted)]">
          {planDescription}
        </p>
      </div>

      {/* Preço */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[var(--eco-text)]">
            R$ {monthlyEquivalent.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs sm:text-sm text-[var(--eco-muted)]">/mês</span>
        </div>

        {/* Preço original riscado (se houver desconto) */}
        {originalPrice && discountPercentage > 0 && (
          <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm text-[var(--eco-muted)] line-through">
              R$ {(originalPrice / (billingPeriod === 'year' ? 12 : 1)).toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full">
              -{discountPercentage}%
            </span>
          </div>
        )}

        {/* Valor total (anual) */}
        {billingPeriod === 'year' && (
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-[var(--eco-muted)]">
            R$ {price.toFixed(2).replace('.', ',')} cobrado anualmente
          </p>
        )}

        {/* Trial Badge */}
        {trialDays > 0 && (
          <div className="mt-2 sm:mt-3 inline-flex items-center gap-1 sm:gap-1.5 bg-[#6EC8FF]/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-[#6EC8FF]/30">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#6EC8FF] animate-pulse" />
            <span className="text-[10px] sm:text-xs font-medium text-[#6EC8FF]">
              {trialDays} dias grátis
            </span>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2 sm:space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-1.5 sm:gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#6EC8FF]/10 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#6EC8FF]" strokeWidth={3} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[var(--eco-text)] leading-relaxed">
              {feature}
            </p>
          </div>
        ))}
      </div>

      {/* CTA Visual (quando selecionado) */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#6EC8FF]/20"
        >
          <p className="text-xs sm:text-sm font-medium text-center text-[#6EC8FF]">
            Plano Selecionado ✓
          </p>
        </motion.div>
      )}
    </motion.button>
  );
}
