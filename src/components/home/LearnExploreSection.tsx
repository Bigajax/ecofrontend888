import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  label: string;
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  icon: string;
  isPremium: boolean;
  date?: string;
  maxim?: string;
  fullText?: string;
  author?: string;
}

interface LearnExploreSectionProps {
  categories: Category[];
  contentItems: ContentItem[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onContentClick: (contentId: string) => void;
}

export default function LearnExploreSection({
  categories,
  contentItems,
  selectedCategory,
  onCategoryChange,
  onContentClick,
}: LearnExploreSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Header */}
      <div className="mb-8 pb-6 flex items-start gap-3" style={{ borderBottom: '1px solid rgba(110,200,255,0.14)' }}>
        <div className="mt-1 w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }} />
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
            Leituras para ir mais fundo
          </h2>
          <p className="mt-1 text-[14px] text-[var(--eco-muted)]">
            Para quem quer entender, não só sentir.
          </p>
        </div>
      </div>

      {/* Category Filters - Desktop horizontal */}
      <div className="mb-8 hidden overflow-x-auto pb-2 md:block">
        <div className="flex gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 font-medium transition-all duration-300 text-[14px] touch-manipulation ${
                selectedCategory === cat.id
                  ? 'text-white'
                  : 'text-[#4A90B8] hover:bg-[rgba(110,200,255,0.14)] active:scale-95'
              }`}
              style={
                selectedCategory === cat.id
                  ? { background: 'linear-gradient(135deg,#6EC8FF,#4BAEE8)', boxShadow: '0 3px 14px rgba(110,200,255,0.38)' }
                  : { background: 'rgba(110,200,255,0.09)', border: '1px solid rgba(110,200,255,0.20)' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filters - Mobile */}
      <div className="mb-6 block md:hidden">
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 3).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-full px-4 py-2 font-medium transition-all duration-300 text-[13px] ${
                selectedCategory === cat.id
                  ? 'text-white'
                  : 'text-[#4A90B8]'
              }`}
              style={
                selectedCategory === cat.id
                  ? { background: 'linear-gradient(135deg,#6EC8FF,#4BAEE8)', boxShadow: '0 3px 14px rgba(110,200,255,0.38)' }
                  : { background: 'rgba(110,200,255,0.09)', border: '1px solid rgba(110,200,255,0.20)' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
      >
        {contentItems.map((item) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 75, damping: 20 } },
            }}
          >
            <ContentCard
              item={item}
              onClick={() => onContentClick(item.id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state */}
      {contentItems.length === 0 && (
        <div className="rounded-2xl border border-[var(--eco-line)] bg-white/60 p-12 text-center backdrop-blur-sm">
          <p className="text-[15px] text-[var(--eco-muted)]">
            Nenhum conteúdo disponível nesta categoria.
          </p>
        </div>
      )}
    </section>
  );
}

interface ContentCardProps {
  item: ContentItem;
  onClick: () => void;
}

function ContentCard({ item, onClick }: ContentCardProps) {
  // Special layout for Diário Estoico with full background image
  const isDiarioEstoico = item.id === 'content_diario_estoico';

  // Extract image URL from url() string or gradient
  const extractImageUrl = (imageString: string): string | null => {
    if (imageString.startsWith('url(')) {
      const match = imageString.match(/url\(['"]?([^'"]+)['"]?\)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const imageUrl = extractImageUrl(item.image);
  const isGradient = item.image.startsWith('linear-gradient');

  if (isDiarioEstoico) {
    return (
      <motion.button
        onClick={onClick}
        className="relative h-80 w-full overflow-hidden rounded-2xl touch-manipulation"
        style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.04)' }}
        whileHover={{ scale: 1.02, boxShadow: '0 12px 50px rgba(0,0,0,0.18)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {/* Background Image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 h-full w-full"
            style={{
              backgroundImage: item.image,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content positioned at bottom */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg">
            {item.title}
          </h3>
          <p className="mt-2 text-[14px] text-white/90 drop-shadow-md">
            Cultive a sabedoria diária através de reflexões estoicas.
          </p>

          {/* Botão CTA */}
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 shadow-md transition-all duration-200 hover:scale-105">
              <span className="text-[13px] font-medium text-gray-900">Acessar diário</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </motion.button>
    );
  }

  // Standard layout for other cards
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-2xl touch-manipulation w-full"
      style={{ border: '1px solid rgba(110,200,255,0.18)', boxShadow: '0 4px 24px rgba(110,200,255,0.08)' }}
      whileHover={{ y: -4, boxShadow: '0 10px 36px rgba(110,200,255,0.18)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {/* Image Section */}
      <div className="relative h-40 overflow-hidden" style={{ background: '#E8F4FF' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300"
          />
        ) : isGradient ? (
          <div
            className="h-full w-full transition-transform duration-300"
            style={{
              backgroundImage: item.image,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div className={`h-full w-full ${item.image}`} />
        )}

        {/* Badge "Artigo" no canto superior esquerdo */}
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full px-3 py-1"
            style={{ background: 'rgba(110,200,255,0.18)', border: '1px solid rgba(110,200,255,0.30)', backdropFilter: 'blur(8px)' }}>
            <span className="text-[11px] font-semibold" style={{ color: '#1A5C8A' }}>
              Artigo
            </span>
          </span>
        </div>
      </div>

      {/* Content Section - below image */}
      <div className="flex flex-col justify-between bg-white p-4 flex-1">
        {/* Top: Premium badge if needed */}
        {item.isPremium && (
          <div className="mb-2 flex items-center gap-1 w-fit rounded-full bg-gray-100 px-2 py-1">
            <Lock size={12} className="text-[var(--eco-user)]" />
            <span className="text-[11px] font-medium text-[var(--eco-user)]">
              Premium
            </span>
          </div>
        )}

        {/* Title and Description */}
        <div>
          <h3 className="font-display text-base font-normal text-[var(--eco-text)]">
            {item.title}
          </h3>
          <p className="mt-2 text-[13px] text-[var(--eco-text)]/70 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
