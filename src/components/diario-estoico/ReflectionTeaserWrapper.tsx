/**
 * ReflectionTeaserWrapper Component
 *
 * Wrapper para reflexões em guest mode que mostra apenas 40-50% do texto
 * com fade gradient e botão CTA para conversão.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import mixpanel from '@/lib/mixpanel';

interface ReflectionTeaserWrapperProps {
  children: React.ReactNode;
  comment: string;
  reflectionId: string;
  visiblePercentage?: number; // Porcentagem do texto visível (padrão: 45%)
}

export default function ReflectionTeaserWrapper({
  children,
  comment,
  reflectionId,
  visiblePercentage = 45,
}: ReflectionTeaserWrapperProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [visibleHeight, setVisibleHeight] = useState<number>(0);
  const { trackDeepScroll } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();

  // Calcular altura visível baseada na porcentagem
  useEffect(() => {
    if (!contentRef.current) return;

    const fullHeight = contentRef.current.scrollHeight;
    const calculatedHeight = (fullHeight * visiblePercentage) / 100;
    setVisibleHeight(calculatedHeight);
  }, [comment, visiblePercentage]);

  // Track scroll depth
  useEffect(() => {
    if (!contentRef.current) return;

    const handleScroll = () => {
      if (!contentRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const scrollDepth = (scrollTop + clientHeight) / scrollHeight;

      // Track deep scroll (>80%)
      if (scrollDepth > 0.8) {
        trackDeepScroll(scrollDepth);
        checkTrigger(ConversionSignals.deepScroll(scrollDepth, reflectionId));
      }
    };

    const element = contentRef.current;
    element.addEventListener('scroll', handleScroll);

    return () => element.removeEventListener('scroll', handleScroll);
  }, [trackDeepScroll, checkTrigger, reflectionId]);

  const handleContinueReading = () => {
    // Track click
    mixpanel.track('Guest Reflection Teaser CTA Clicked', {
      reflection_id: reflectionId,
    });

    // Trigger conversion modal
    checkTrigger(ConversionSignals.reflectionViewed(reflectionId));

    // Navigate to login
    navigate('/login?returnTo=/app/diario-estoico');
  };

  return (
    <div className="relative">
      {/* Quote card (sempre visível) */}
      {children}

      {/* Comment section com teaser */}
      <div className="relative bg-white border-t border-gray-200">
        {/* Conteúdo parcialmente visível */}
        <div
          ref={contentRef}
          className="relative overflow-hidden"
          style={{
            maxHeight: visibleHeight > 0 ? `${visibleHeight}px` : 'auto',
          }}
        >
          <div className="p-6 lg:p-8 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Comentário</h3>
            <p className="text-sm lg:text-base leading-relaxed text-gray-700 whitespace-pre-line">
              {comment}
            </p>
          </div>

          {/* Gradient fade overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 40%, rgba(255, 255, 255, 0) 100%)',
            }}
          />
        </div>

        {/* CTA Button */}
        <div className="relative px-6 lg:px-8 pb-6 lg:pb-8 pt-4 bg-white">
          <motion.button
            onClick={handleContinueReading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-[#6EC8FF] hover:bg-[#36B3FF]
                       text-white px-6 py-4 rounded-xl font-primary font-semibold text-base
                       shadow-lg hover:shadow-xl transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            <span>Continue esta reflexão →</span>
          </motion.button>

          {/* Subtitle */}
          <p className="text-center text-xs text-[var(--eco-muted)] mt-3 font-primary">
            Crie sua conta em 30 segundos — sempre gratuito
          </p>
        </div>
      </div>
    </div>
  );
}
