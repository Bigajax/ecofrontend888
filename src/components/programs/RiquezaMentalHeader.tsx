interface RiquezaMentalHeaderProps {
  onBack: () => void;
}

export default function RiquezaMentalHeader({ onBack }: RiquezaMentalHeaderProps) {
  return (
    <header className="border-b border-eco-line bg-eco-bg py-6 md:py-8">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center justify-center gap-2 px-4 py-2
                     text-sm font-primary font-medium text-eco-text glass-shell rounded-full
                     hover:bg-eco-accent/5 transition-all duration-200 shadow-minimal"
        >
          <span>←</span>
          <span>Voltar</span>
        </button>

        {/* Title and Subtitle */}
        <div>
          <h1 className="font-display text-4xl font-medium text-eco-text md:text-5xl">
            Quem Pensa Enriquece
          </h1>
          <p className="mt-2 text-lg font-primary text-eco-muted">
            Transforme seu mindset financeiro
          </p>
        </div>
      </div>
    </header>
  );
}
