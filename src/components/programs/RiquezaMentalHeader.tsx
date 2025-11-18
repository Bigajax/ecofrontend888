interface RiquezaMentalHeaderProps {
  onBack: () => void;
}

export default function RiquezaMentalHeader({ onBack }: RiquezaMentalHeaderProps) {
  return (
    <header className="border-b border-gray-200/50 bg-[#F8F6F3] py-6 md:py-8">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 transition-all hover:text-black"
        >
          <span>←</span>
          <span>Voltar</span>
        </button>

        {/* Title and Subtitle */}
        <div>
          <h1 className="font-display text-4xl font-normal text-black md:text-5xl">
            Quem Pensa Enriquece
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Transforme seu mindset financeiro
          </p>
        </div>
      </div>
    </header>
  );
}
