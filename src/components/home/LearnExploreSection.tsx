import { Lock, Play } from 'lucide-react';

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
      <div className="mb-8">
        <h2 className="font-display text-2xl font-normal text-[var(--eco-text)]">
          Aprenda e explore
        </h2>
        <p className="mt-2 text-[14px] text-[var(--eco-muted)]">
          Meditações selecionadas com base na sua preferência e no seu humor
        </p>
      </div>

      {/* Category Filters - Desktop horizontal */}
      <div className="mb-8 hidden overflow-x-auto pb-2 md:block">
        <div className="flex gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 font-medium transition-all duration-300 text-[14px] ${
                selectedCategory === cat.id
                  ? 'bg-[var(--eco-user)] text-white shadow-[0_4px_15px_rgba(167,132,108,0.3)]'
                  : 'border border-[var(--eco-line)] bg-white/60 text-[var(--eco-text)] backdrop-blur-sm hover:bg-white/80 hover:-translate-y-0.5'
              }`}
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
                  ? 'bg-[var(--eco-user)] text-white shadow-[0_2px_10px_rgba(167,132,108,0.2)]'
                  : 'border border-[var(--eco-line)] bg-white/60 text-[var(--eco-text)] backdrop-blur-sm'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {contentItems.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onClick={() => onContentClick(item.id)}
          />
        ))}
      </div>

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
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:translate-y-0"
    >
      {/* Background image/gradient */}
      <div
        className={`absolute inset-0 ${item.image} transition-transform duration-300 group-hover:scale-105`}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative flex h-52 flex-col justify-between p-4">
        {/* Top: Icon and Premium badge */}
        <div className="flex items-start justify-between">
          <span className="text-3xl">{item.icon}</span>
          {item.isPremium && (
            <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 backdrop-blur-sm">
              <Lock size={12} className="text-[var(--eco-user)]" />
              <span className="text-[11px] font-medium text-[var(--eco-user)]">
                Premium
              </span>
            </div>
          )}
        </div>

        {/* Bottom: Title, Description, and Play button */}
        <div>
          <h3 className="font-display text-lg font-normal text-[var(--eco-text)]">
            {item.title}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--eco-text)]/70">
            {item.description}
          </p>

          {/* Play button - shows on hover/mobile */}
          <div className="mt-3 flex items-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all duration-300 group-hover:bg-white">
              <Play
                size={14}
                className="fill-[var(--eco-user)] text-[var(--eco-user)]"
              />
            </div>
            <span className="text-[13px] font-medium text-white">Ouvir</span>
          </div>
        </div>
      </div>
    </button>
  );
}
