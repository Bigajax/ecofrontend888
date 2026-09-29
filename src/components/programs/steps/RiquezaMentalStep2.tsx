interface Step2Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep2({ answers, onAnswerChange }: Step2Props) {
  return (
    <div className="space-y-8">
      {/* Badge */}
      <div>
        <span className="inline-flex">
          <span className="reino-rotulo text-eco-muted">
            PASSO 2 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          O que você realmente quer
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 font-primary text-eco-text leading-relaxed">
        <p>
          Napoleon Hill chamava isso de <span className="font-medium text-eco-baby">'desejo ardente'</span>: um objetivo claro o suficiente para que sua mente saiba para onde ir.
        </p>
        <p>
          Pense em você daqui a 3 anos. As coisas deram certo. Como está a sua vida financeira nessa versão de você?
        </p>
        <div className="border-l-[3px] border-[#EDB85A] pl-4 py-1 mt-4">
          <p className="text-sm text-eco-text leading-relaxed">
            <span className="font-medium">💡 Importante:</span> Um desejo vago não orienta decisões.
            Pense em <span className="font-medium text-eco-baby">tranquilidade, segurança, controle ou liberdade</span>, não em números fantasiosos sem base emocional.
          </p>
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Como seria sua vida financeira ideal daqui a 3 anos se tudo se organizasse?
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step2 || ''}
          onChange={(e) => onAnswerChange('step2', e.target.value)}
          placeholder="Ex.: ter reserva de 6 meses / viver sem ansiedade financeira / quitar dívidas…"
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
