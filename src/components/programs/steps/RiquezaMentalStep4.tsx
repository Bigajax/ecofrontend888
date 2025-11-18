interface Step4Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep4({ answers, onAnswerChange }: Step4Props) {
  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          Uma frase nova para sua história
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Você não precisa de uma frase perfeita.
        </p>
        <p>
          Precisa de algo verdadeiro o suficiente para você hoje,<br />
          e alinhado com quem você quer se tornar.
        </p>
        <p className="font-medium text-amber-900 bg-amber-50 rounded-xl p-4">
          Essa frase será seu ponto de recalibração.
        </p>
      </div>

      {/* Question */}
      <div>
        <label className="block font-medium text-black mb-4">
          Qual frase nova você quer começar a repetir sobre dinheiro?
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step4 || ''}
          onChange={(e) => onAnswerChange('step4', e.target.value)}
          placeholder="Ex.: estou aprendendo a cuidar melhor do meu dinheiro, passo a passo."
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={4}
        />
      </div>
    </div>
  );
}
