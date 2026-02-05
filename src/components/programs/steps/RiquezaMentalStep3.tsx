interface Step3Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep3({ answers, onAnswerChange }: Step3Props) {
  return (
    <div className="space-y-8 rounded-3xl glass-shell p-8 md:p-10 shadow-eco">
      {/* Badge */}
      <div>
        <span className="inline-flex rounded-full px-4 py-1.5 bg-eco-baby">
          <span className="text-[11px] font-semibold text-white tracking-wide">
            PASSO 3 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          O que te puxa de volta
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 font-primary text-eco-text leading-relaxed">
        <div className="mb-4">
          <h3 className="font-display text-lg text-eco-text mb-2 font-medium">
            O que não é nomeado costuma comandar
          </h3>
          <p className="text-sm text-eco-muted">
            Medos financeiros são padrões mentais recorrentes. Eles se manifestam em frases internas
            e comportamentos repetidos. Nomear o medo reduz seu poder inconsciente.
          </p>
        </div>
        <p>
          Hill falava dos <span className="font-medium text-eco-baby">'fantasmas do medo'</span>: pobreza, crítica, fracasso, perder o amor, velhice e incerteza.
        </p>
        <div className="italic text-eco-muted bg-eco-bg rounded-xl p-4 border border-eco-line">
          <p className="text-sm">
            "não sou bom com dinheiro", "sempre erro", "isso não é pra mim".
          </p>
        </div>
      </div>

      {/* Question 1 */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Que medo aparece quando você pensa no seu futuro financeiro?
        </label>
        <textarea
          value={answers.step3_fear || ''}
          onChange={(e) => onAnswerChange('step3_fear', e.target.value)}
          placeholder="Ex.: medo de nunca conseguir sair das dívidas…"
          className="w-full rounded-2xl border-2 border-eco-line bg-white/80 px-5 py-4
                     font-primary text-eco-text placeholder:text-eco-muted/60
                     focus:border-eco-baby focus:outline-none focus:ring-2 focus:ring-eco-baby/20
                     transition-all duration-200"
          rows={3}
        />
      </div>

      {/* Question 2 */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Que frase interna mais te limita hoje?
        </label>
        <textarea
          value={answers.step3_belief || ''}
          onChange={(e) => onAnswerChange('step3_belief', e.target.value)}
          placeholder="Ex.: eu não consigo manter dinheiro…"
          className="w-full rounded-2xl border-2 border-eco-line bg-white/80 px-5 py-4
                     font-primary text-eco-text placeholder:text-eco-muted/60
                     focus:border-eco-baby focus:outline-none focus:ring-2 focus:ring-eco-baby/20
                     transition-all duration-200"
          rows={3}
        />
      </div>
    </div>
  );
}
