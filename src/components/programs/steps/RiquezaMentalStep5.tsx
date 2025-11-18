interface Step5Props {
  answers: any;
  onAnswerChange: (key: string, value: string | string[]) => void;
}

const ACTIONS = [
  { id: 'review_spending', label: 'Revisar meus gastos dos últimos 30 dias' },
  { id: 'track_expenses', label: 'Anotar tudo que eu gastar por uma semana' },
  { id: 'create_reserve', label: 'Separar um espaço/conta para iniciar uma pequena reserva' },
  { id: 'study_finance', label: 'Estudar 10 minutos por dia sobre finanças' },
];

export default function RiquezaMentalStep5({ answers, onAnswerChange }: Step5Props) {
  const selectedActions = (answers.step5_actions || []) as string[];

  const toggleAction = (actionId: string) => {
    const updated = selectedActions.includes(actionId)
      ? selectedActions.filter(id => id !== actionId)
      : [...selectedActions, actionId];
    onAnswerChange('step5_actions', updated);
  };

  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100/50">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-normal text-black md:text-4xl">
          Próximos 7 dias
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Mudança não acontece no futuro distante. Acontece nos próximos dias.
        </p>
        <p className="font-medium">
          Escolha apenas 1 a 3 ações simples — pequenas o suficiente para você realmente cumprir.
        </p>
      </div>

      {/* Checklist */}
      <div>
        <label className="block font-medium text-black mb-4">
          O que você fará nos próximos 7 dias?
        </label>

        <div className="space-y-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => toggleAction(action.id)}
              className="flex items-start gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 p-4 text-left transition-all hover:border-amber-300 hover:bg-amber-50/30 w-full"
            >
              {/* Checkbox */}
              <div
                className={`mt-1 h-6 w-6 flex-shrink-0 rounded-lg border-2 transition-all ${
                  selectedActions.includes(action.id)
                    ? 'border-amber-400 bg-amber-400'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {selectedActions.includes(action.id) && (
                  <svg
                    className="h-full w-full text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span className="text-gray-800 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Final Question */}
      <div>
        <label className="block font-medium text-black mb-4">
          Qual é a menor ação concreta que você se compromete a fazer nos próximos 7 dias?
        </label>

        <textarea
          value={answers.step5_commitment || ''}
          onChange={(e) => onAnswerChange('step5_commitment', e.target.value)}
          placeholder="Ex.: anotar todos os gastos até domingo."
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-800 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
          rows={3}
        />
      </div>
    </div>
  );
}
