import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function EcoDreamGuidanceCard() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Heading no padrão das outras seções (barra vertical baby blue + título) */}
      <div className="mb-5 flex items-start gap-3">
        <div
          className="mt-1 h-6 w-1 flex-shrink-0 rounded-full"
          style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }}
        />
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
            Interpretar seus sonhos
          </h2>
          <p className="mt-0.5 text-[14px] text-[var(--eco-muted)]">
            Descubra o que sua mente está dizendo enquanto você dorme
          </p>
        </div>
      </div>

      <motion.button
        onClick={() => navigate('/app/dream')}
        className="group relative h-[230px] w-full max-w-sm overflow-hidden rounded-2xl p-5 text-left"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.1 }}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.995 }}
        style={{
          background: '#FFFFFF',
          boxShadow:
            '0 8px 24px rgba(110, 200, 255, 0.18), 0 1px 3px rgba(13, 52, 97, 0.06)',
          border: '1px solid rgba(110, 200, 255, 0.15)',
        }}
      >
        {/* Mascote ancorado no canto superior esquerdo — estilo sticker */}
        <img
          src="/images/eco-dream-icon.webp"
          alt="Eco Dream"
          className="absolute h-[120px] w-[120px] object-contain transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
          style={{
            top: '-6px',
            left: '-4px',
            filter: 'drop-shadow(0 8px 18px rgba(110, 200, 255, 0.40))',
          }}
        />

        {/* Rodapé: título, descrição e seta — ancorado embaixo */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="font-display"
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: '#002548',
                lineHeight: 1.2,
                margin: 0,
                letterSpacing: '-0.005em',
              }}
            >
              Eco Dream
            </p>
            <p
              className="mt-1"
              style={{
                fontSize: '12.5px',
                color: 'rgba(0, 37, 72, 0.58)',
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              Conte um sonho. Receba uma interpretação inspirada em Freud e Jung.
            </p>
          </div>

          <div
            className="flex flex-shrink-0 items-center justify-center self-end rounded-full transition-all duration-200 group-hover:bg-white/70"
            style={{
              width: '38px',
              height: '38px',
              background: 'rgba(110, 200, 255, 0.18)',
              color: '#002548',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </motion.button>
    </section>
  );
}
