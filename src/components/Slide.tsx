import React, { useRef, useEffect } from 'react';
import GlassBubble from './GlassBubble';

interface SlideProps {
  title: string;
  text: string[];
  bubblePosition: string;
  background: string;
  onNext?: () => void;
  onPrev?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const Slide: React.FC<SlideProps> = ({ title, text, background }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.animate(
      [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'ease-out' }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-stretch justify-start overflow-visible"
      style={{ background }}
      aria-live="polite"
    >
      {/* padding extra no rodapé para os controles (setas + dots) */}
      <div className="flex h-full w-full flex-col items-center px-6 md:px-10 pt-7 md:pt-8 pb-[120px] md:pb-[132px]">
        {/* título */}
        <h1
          className="text-slate-900 font-semibold text-center"
          style={{
            fontFamily: `'Playfair Display', serif`,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            fontSize: 'clamp(1.5rem, 1.2rem + 0.9vw, 2rem)',
          }}
        >
          {title}
        </h1>

        {/* descrição */}
        <div className="mt-3 md:mt-3.5 max-w-[38rem] w-full text-center text-slate-600">
          {text.map((t, i) => (
            <p
              key={i}
              className={i === 0 ? 'mx-auto' : 'mx-auto mt-2'}
              style={{
                fontSize: 'clamp(1rem, 0.95rem + 0.4vw, 1.125rem)',
                lineHeight: 1.45,
                maxWidth: '34rem',
              }}
            >
              {t}
            </p>
          ))}
        </div>

        {/* bolha */}
        <div className="mt-5 md:mt-7 flex-1 flex items-end justify-center mb-2 overflow-visible">
          <GlassBubble
            variant="clear"
            // menorzinho e com limite mais conservador
            size="clamp(11.5rem, 40vw, 16.5rem)"
            className="mx-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default Slide;
