interface Step4Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep4({ answers, onAnswerChange }: Step4Props) {
  return (
    <div className="space-y-8 rounded-3xl glass-shell p-8 md:p-10 shadow-eco">
      {/* Badge */}
      <div>
        <span className="inline-flex rounded-full px-4 py-1.5 bg-eco-baby">
          <span className="text-[11px] font-semibold text-white tracking-wide">
            PASSO 4 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          Uma frase nova para sua história
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 font-primary text-eco-text leading-relaxed">
        <p>
          Afirmações só funcionam quando ligadas a ações concretas.
        </p>
        <p>
          Precisa de algo verdadeiro o suficiente para você hoje,<br />
          e alinhado com quem você quer se tornar.
        </p>
        <div className="bg-eco-baby/10 border border-eco-baby/30 rounded-xl p-5 mt-4">
          <p className="text-sm text-eco-text mb-2">
            <span className="font-medium">Formato sugerido:</span>
          </p>
          <p className="text-sm text-eco-muted italic leading-relaxed">
            "Mesmo que eu sinta <span className="underline decoration-eco-baby">medo de não conseguir</span>, eu escolho <span className="underline decoration-eco-baby">construir uma reserva mês a mês</span>, e ajo fazendo <span className="underline decoration-eco-baby">um depósito fixo toda semana</span>."
          </p>
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Crie sua afirmação consciente ligada à ação:
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step4 || ''}
          onChange={(e) => onAnswerChange('step4', e.target.value)}
          placeholder="Mesmo que eu sinta ___, eu escolho ___, e ajo fazendo ___."
          className="w-full rounded-2xl border-2 border-eco-line bg-white/80 px-5 py-4
                     font-primary text-eco-text placeholder:text-eco-muted/60
                     focus:border-eco-baby focus:outline-none focus:ring-2 focus:ring-eco-baby/20
                     transition-all duration-200"
          rows={5}
        />
        <p className="text-xs text-eco-muted mt-2 font-primary">
          Use o formato acima como guia. A frase deve incluir: emoção → escolha → ação concreta.
        </p>
      </div>
    </div>
  );
}
