interface Step1Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep1({ answers, onAnswerChange }: Step1Props) {
  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          Onde você está hoje
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Antes de falar de riqueza, precisamos olhar com honestidade para a sua relação atual com o dinheiro.
        </p>
        <p className="font-medium">
          Não é sobre culpa.<br />
          Não é sobre comparação.<br />
          É sobre clareza — o primeiro passo para qualquer mudança real.
        </p>
      </div>

      {/* Question */}
      <div>
        <label className="block font-medium text-black mb-4">
          Se você tivesse que resumir a sua relação com dinheiro em uma frase, qual seria?
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step1 || ''}
          onChange={(e) => onAnswerChange('step1', e.target.value)}
          placeholder="Ex.: sempre falta no fim do mês… / ganho bem, mas não organizo…"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={4}
        />
      </div>
    </div>
  );
}
