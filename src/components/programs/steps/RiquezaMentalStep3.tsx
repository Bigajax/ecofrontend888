interface Step3Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep3({ answers, onAnswerChange }: Step3Props) {
  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          O que te puxa de volta
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Hill falava dos <span className="font-medium">'fantasmas do medo'</span>: pobreza, crítica, fracasso, perder o amor, velhice e incerteza.
        </p>
        <p>
          Eles aparecem em frases como:
        </p>
        <p className="italic text-gray-600">
          "não sou bom com dinheiro", "sempre erro", "isso não é pra mim".
        </p>
        <p>
          É importante nomear o que te prende.
        </p>
      </div>

      {/* Question 1 */}
      <div>
        <label className="block font-medium text-black mb-4">
          Que medo aparece quando você pensa no seu futuro financeiro?
        </label>
        <textarea
          value={answers.step3_fear || ''}
          onChange={(e) => onAnswerChange('step3_fear', e.target.value)}
          placeholder="Ex.: medo de nunca conseguir sair das dívidas…"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={3}
        />
      </div>

      {/* Question 2 */}
      <div>
        <label className="block font-medium text-black mb-4">
          Que frase interna mais te limita hoje?
        </label>
        <textarea
          value={answers.step3_belief || ''}
          onChange={(e) => onAnswerChange('step3_belief', e.target.value)}
          placeholder="Ex.: eu não consigo manter dinheiro…"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={3}
        />
      </div>
    </div>
  );
}
