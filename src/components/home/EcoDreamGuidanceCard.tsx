import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function EcoDreamGuidanceCard() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Barra azul + título grande/forte — escala com a tela p/ não quebrar no mobile */}
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: '5px',
            height: 'clamp(18px, 5.6vw, 30px)',
            background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)',
          }}
        />
        <h2 className="whitespace-nowrap font-display text-[clamp(17px,5.6vw,30px)] font-extrabold leading-tight tracking-tight text-[var(--eco-text)]">
          Interpretar seus sonhos
        </h2>
      </div>

      {/* Card horizontal: mascote · texto · chevron */}
      <motion.button
        onClick={() => navigate('/app/dream')}
        className="group flex w-full max-w-md items-center gap-3 rounded-[26px] py-4 pl-3 pr-4 text-left"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.992 }}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(13, 27, 42, 0.07)',
          boxShadow: '0 4px 18px rgba(13, 27, 42, 0.05)',
        }}
      >
        {/* Mascote */}
        <img
          src="/images/eco-mascote.png"
          alt="Eco Dream"
          width="72"
          height="72"
          decoding="async"
          loading="lazy"
          className="-ml-1 h-[72px] w-[72px] flex-shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
          style={{ filter: 'drop-shadow(0 6px 16px rgba(110, 200, 255, 0.35))' }}
        />

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <p
            className="font-display"
            style={{
              fontSize: '21px',
              fontWeight: 700,
              color: '#0D1B2A',
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Eco Dream
          </p>
          <p
            className="mt-1 line-clamp-2"
            style={{
              fontSize: '14.5px',
              color: 'rgba(13, 27, 42, 0.55)',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Conte um sonho. Receba uma interpretação inspirada em Freud e Jung.
          </p>
        </div>

        {/* Chevron fino */}
        <ChevronRight
          size={26}
          strokeWidth={2}
          className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: 'rgba(13, 27, 42, 0.3)' }}
        />
      </motion.button>
    </section>
  );
}
