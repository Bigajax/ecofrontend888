interface Step6Props {
  answers?: any;
  onAnswerChange?: (key: string, value: string) => void;
}

export default function RiquezaMentalStep6({ answers, onAnswerChange }: Step6Props) {
  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          Fechando sua sessão
        </h2>
      </div>

      {/* Completion Message */}
      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Você acabou de fazer o que a maioria das pessoas evita: <span className="font-medium">olhar de frente para sua relação com dinheiro.</span>
        </p>

        <p>
          Você trouxe <span className="font-medium">clareza</span>, nomeou seus medos, definiu um desejo real e escolheu um passo prático.
        </p>

        <p className="text-lg font-medium text-amber-900 bg-amber-50 rounded-xl p-5 border border-amber-100">
          Não é sobre pressa. É sobre direção.
        </p>

        <p>
          Você pode voltar a esta sessão sempre que quiser.
        </p>

        {/* Summary */}
        <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-200/50 space-y-3 mt-8">
          <h3 className="font-medium text-black">Resumo da sua jornada:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Você identificou sua relação atual com dinheiro</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Você definiu seu desejo financeiro para 3 anos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Você nomeou seus medos e limitações</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Você criou uma nova afirmação sobre dinheiro</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Você escolheu ações concretas para os próximos 7 dias</span>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Próximo passo:</span> Coloque seu compromisso em prática. Pequenas ações, dia após dia, constroem riqueza de verdade.
          </p>
        </div>
      </div>
    </div>
  );
}
