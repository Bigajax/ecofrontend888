interface Step2Props {
  answers: any;
  onAnswerChange: (key: string, value: string) => void;
}

export default function RiquezaMentalStep2({ answers, onAnswerChange }: Step2Props) {
  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          O que você realmente quer
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Napoleon Hill chamava isso de <span className="font-medium">'desejo ardente'</span>: um objetivo claro o suficiente para que sua mente saiba para onde ir.
        </p>
        <p>
          Pense em você daqui a 3 anos. As coisas deram certo. Como está a sua vida financeira nessa versão de você?
        </p>
      </div>

      {/* Question */}
      <div>
        <label className="block font-medium text-black mb-4">
          Como seria sua vida financeira ideal daqui a 3 anos se tudo se organizasse?
        </label>

        {/* Text Input */}
        <textarea
          value={answers.step2 || ''}
          onChange={(e) => onAnswerChange('step2', e.target.value)}
          placeholder="Ex.: ter reserva de 6 meses / viver sem ansiedade financeira / quitar dívidas…"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={4}
        />
      </div>
    </div>
  );
}
