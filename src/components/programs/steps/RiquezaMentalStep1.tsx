interface Step1Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep1({ answers, onAnswerChange }: Step1Props) {
  return (
    <div className="space-y-8 rounded-3xl glass-shell p-8 md:p-10 shadow-eco">
      {/* Badge */}
      <div>
        <span className="inline-flex rounded-full px-4 py-1.5 bg-eco-baby">
          <span className="text-[11px] font-semibold text-white tracking-wide">
            PASSO 1 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          Onde você está hoje
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 font-primary text-eco-text leading-relaxed">
        <p>
          Antes de pensar em riqueza, precisamos entender o ponto de partida.
        </p>
        <div className="text-sm text-eco-muted bg-eco-baby/10 rounded-xl p-4 border border-eco-baby/20">
          <p className="leading-relaxed">
            <span className="font-medium text-eco-text">Clareza precede qualquer mudança.</span> Não há progresso sem consciência do ponto atual.
            Não é sobre comparação ou julgamento — é sobre responsabilidade consciente.
          </p>
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Se você tivesse que resumir a sua relação com dinheiro em uma frase, qual seria?
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step1 || ''}
          onChange={(e) => onAnswerChange('step1', e.target.value)}
          placeholder="Ex.: sempre falta no fim do mês… / ganho bem, mas não organizo…"
          className="w-full rounded-2xl border-2 border-eco-line bg-white/80 px-5 py-4
                     font-primary text-eco-text placeholder:text-eco-muted/60
                     focus:border-eco-baby focus:outline-none focus:ring-2 focus:ring-eco-baby/20
                     transition-all duration-200"
          rows={4}
        />
      </div>
    </div>
  );
}
