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

const MAX_ACTIONS = 3;

export default function RiquezaMentalStep5({ answers, onAnswerChange }: Step5Props) {
  const selectedActions = (answers.step5_actions || []) as string[];

  const toggleAction = (actionId: string) => {
    if (selectedActions.includes(actionId)) {
      // Remove se já selecionada
      const updated = selectedActions.filter(id => id !== actionId);
      onAnswerChange('step5_actions', updated);
    } else {
      // Adiciona se não atingiu o limite
      if (selectedActions.length < MAX_ACTIONS) {
        const updated = [...selectedActions, actionId];
        onAnswerChange('step5_actions', updated);
      }
      // Silenciosamente ignora se já tiver 3 selecionadas
    }
  };

  return (
    <div className="space-y-8 rounded-3xl glass-shell p-8 md:p-10 shadow-eco">
      {/* Badge */}
      <div>
        <span className="inline-flex rounded-full px-4 py-1.5 bg-eco-baby">
          <span className="text-[11px] font-semibold text-white tracking-wide">
            PASSO 5 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          Próximos 7 dias
        </h2>
      </div>

      {/* Introduction Text */}
      <div className="space-y-4 font-primary text-eco-text leading-relaxed">
        <p>
          Mudança não acontece no futuro distante. Acontece nos próximos dias.
        </p>
        <div className="font-medium text-eco-text bg-eco-baby/10 rounded-xl p-4 border border-eco-baby/20">
          <p>Pequenas ações repetidas &gt; grandes planos abandonados</p>
        </div>
        <p className="text-sm text-eco-muted">
          Foco é consistência, não perfeição. Escolha no máximo <span className="font-medium text-eco-baby">3 ações</span> — pequenas o suficiente para você realmente cumprir.
        </p>
      </div>

      {/* Checklist */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-3">
          O que você fará nos próximos 7 dias?
        </label>
        <p className="text-sm text-eco-muted mb-4 font-primary">
          <span className="font-semibold text-eco-baby">{selectedActions.length}</span> de {MAX_ACTIONS} ações selecionadas
        </p>

        <div className="space-y-3">
          {ACTIONS.map((action) => {
            const isSelected = selectedActions.includes(action.id);
            const isDisabled = !isSelected && selectedActions.length >= MAX_ACTIONS;

            return (
              <button
                key={action.id}
                onClick={() => toggleAction(action.id)}
                disabled={isDisabled}
                className={`flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all w-full ${
                  isDisabled
                    ? 'border-eco-line bg-eco-bg opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-eco-baby bg-eco-baby/5 hover:bg-eco-baby/10'
                    : 'border-eco-line bg-white/80 hover:border-eco-baby/50 hover:bg-eco-baby/5'
                }`}
              >

              {/* Checkbox */}
              <div
                className={`mt-1 h-6 w-6 flex-shrink-0 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-eco-baby bg-eco-baby'
                    : 'border-eco-line bg-white'
                }`}
              >
                {isSelected && (
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
              <span className="text-eco-text font-primary font-medium">{action.label}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* Final Question */}
      <div>
        <label className="block font-primary font-medium text-eco-text mb-4">
          Qual é a menor ação concreta que você se compromete a fazer nos próximos 7 dias?
        </label>

        <textarea
          value={answers.step5_commitment || ''}
          onChange={(e) => onAnswerChange('step5_commitment', e.target.value)}
          placeholder="Ex.: anotar todos os gastos até domingo."
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
