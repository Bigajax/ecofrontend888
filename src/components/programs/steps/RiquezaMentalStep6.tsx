import { Download } from 'lucide-react';

interface Step6Props {
  answers?: any;
  onAnswerChange?: (key: string, value: string) => void;
}

const exportAnswersAsText = (answers: any) => {
  const text = `
QUEM PENSA ENRIQUECE - Minhas Respostas
Data: ${new Date().toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ONDE VOCÊ ESTÁ HOJE
${answers?.step1 || '(não respondido)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. O QUE VOCÊ REALMENTE QUER
${answers?.step2 || '(não respondido)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. O QUE TE PUXA DE VOLTA

Medo principal:
${answers?.step3_fear || '(não respondido)'}

Frase limitante:
${answers?.step3_belief || '(não respondido)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. SUA NOVA AFIRMAÇÃO
${answers?.step4 || '(não respondido)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. PRÓXIMOS 7 DIAS

Ações selecionadas:
${(answers?.step5_actions || []).map((a: string) => {
  const labels: Record<string, string> = {
    review_spending: 'Revisar meus gastos dos últimos 30 dias',
    track_expenses: 'Anotar tudo que eu gastar por uma semana',
    create_reserve: 'Separar um espaço/conta para iniciar uma pequena reserva',
    study_finance: 'Estudar 10 minutos por dia sobre finanças'
  };
  return `• ${labels[a] || a}`;
}).join('\n') || '(nenhuma ação selecionada)'}

Compromisso:
${answers?.step5_commitment || '(não respondido)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Não é sobre pressa. É sobre direção."
  `;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quem-pensa-enriquece-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function RiquezaMentalStep6({ answers, onAnswerChange }: Step6Props) {
  return (
    <div className="space-y-8 rounded-3xl glass-shell p-8 md:p-10 shadow-eco">
      {/* Badge */}
      <div>
        <span className="inline-flex rounded-full px-4 py-1.5 bg-eco-baby">
          <span className="text-[11px] font-semibold text-white tracking-wide">
            PASSO 6 DE 6
          </span>
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-medium text-eco-text md:text-4xl leading-tight">
          Fechando sua sessão
        </h2>
      </div>

      {/* Completion Message */}
      <div className="space-y-6 font-primary text-eco-text leading-relaxed">
        <p>
          Você acabou de fazer o que a maioria das pessoas evita: <span className="font-medium text-eco-baby">olhar de frente para sua relação com dinheiro.</span>
        </p>

        <p>
          Você trouxe <span className="font-medium text-eco-baby">clareza</span>, nomeou seus medos, definiu um desejo real e escolheu um passo prático.
        </p>

        <div className="text-center">
          <p className="text-lg font-display font-medium text-eco-text bg-eco-baby/10 rounded-xl p-5 border border-eco-baby/30">
            Não é sobre pressa. É sobre direção.
          </p>
          <p className="text-sm text-eco-muted mt-3">
            Você criou clareza, direção e um compromisso prático.<br />
            Continue revisitando suas respostas nos próximos dias.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-eco-bg rounded-2xl p-6 border border-eco-line space-y-3 mt-8">
          <h3 className="font-primary font-medium text-eco-text">Resumo da sua jornada:</h3>
          <ul className="space-y-2 text-sm text-eco-text font-primary">
            <li className="flex items-start gap-3">
              <span className="text-eco-baby font-bold">✓</span>
              <span>Você identificou sua relação atual com dinheiro</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-eco-baby font-bold">✓</span>
              <span>Você definiu seu desejo financeiro para 3 anos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-eco-baby font-bold">✓</span>
              <span>Você nomeou seus medos e limitações</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-eco-baby font-bold">✓</span>
              <span>Você criou uma nova afirmação sobre dinheiro</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-eco-baby font-bold">✓</span>
              <span>Você escolheu ações concretas para os próximos 7 dias</span>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t border-eco-line">
          <p className="text-sm text-eco-muted font-primary">
            <span className="font-medium text-eco-text">Próximo passo:</span> Coloque seu compromisso em prática. Pequenas ações, dia após dia, constroem riqueza de verdade.
          </p>
        </div>
      </div>

      {/* Preview de Respostas */}
      {answers && Object.keys(answers).length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="font-display text-xl text-eco-text font-medium">
            Suas Respostas
          </h3>

          <div className="bg-eco-bg border border-eco-line rounded-2xl p-6 space-y-5">
            {answers.step1 && (
              <div>
                <p className="text-sm font-primary font-medium text-eco-muted mb-1">
                  1. Onde você está hoje:
                </p>
                <p className="text-sm font-primary text-eco-text leading-relaxed">
                  {answers.step1}
                </p>
              </div>
            )}

            {answers.step2 && (
              <div>
                <p className="text-sm font-primary font-medium text-eco-muted mb-1">
                  2. O que você quer:
                </p>
                <p className="text-sm font-primary text-eco-text leading-relaxed">
                  {answers.step2}
                </p>
              </div>
            )}

            {(answers.step3_fear || answers.step3_belief) && (
              <div>
                <p className="text-sm font-primary font-medium text-eco-muted mb-1">
                  3. O que te puxa de volta:
                </p>
                {answers.step3_fear && (
                  <p className="text-sm font-primary text-eco-text leading-relaxed mb-2">
                    <span className="font-medium text-eco-baby">Medo:</span> {answers.step3_fear}
                  </p>
                )}
                {answers.step3_belief && (
                  <p className="text-sm font-primary text-eco-text leading-relaxed">
                    <span className="font-medium text-eco-baby">Frase limitante:</span> {answers.step3_belief}
                  </p>
                )}
              </div>
            )}

            {answers.step4 && (
              <div>
                <p className="text-sm font-primary font-medium text-eco-muted mb-1">
                  4. Sua nova afirmação:
                </p>
                <p className="text-sm font-primary text-eco-text leading-relaxed">
                  {answers.step4}
                </p>
              </div>
            )}

            {(answers.step5_actions?.length > 0 || answers.step5_commitment) && (
              <div>
                <p className="text-sm font-primary font-medium text-eco-muted mb-1">
                  5. Próximos 7 dias:
                </p>
                {answers.step5_actions?.length > 0 && (
                  <div className="text-sm font-primary text-eco-text mb-2">
                    <span className="font-medium text-eco-baby">Ações:</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      {answers.step5_actions.map((actionId: string) => {
                        const labels: Record<string, string> = {
                          review_spending: 'Revisar meus gastos dos últimos 30 dias',
                          track_expenses: 'Anotar tudo que eu gastar por uma semana',
                          create_reserve: 'Separar um espaço/conta para iniciar uma pequena reserva',
                          study_finance: 'Estudar 10 minutos por dia sobre finanças'
                        };
                        return <li key={actionId}>{labels[actionId] || actionId}</li>;
                      })}
                    </ul>
                  </div>
                )}
                {answers.step5_commitment && (
                  <p className="text-sm font-primary text-eco-text leading-relaxed">
                    <span className="font-medium text-eco-baby">Compromisso:</span> {answers.step5_commitment}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Botão de Exportar */}
          <button
            onClick={() => exportAnswersAsText(answers)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3
                     text-sm font-primary font-medium text-eco-text glass-shell
                     rounded-xl hover:bg-eco-baby/5 hover:border-eco-baby/50
                     transition-all duration-200 active:scale-95 shadow-minimal"
          >
            <Download size={16} />
            Exportar minhas respostas
          </button>
        </div>
      )}
    </div>
  );
}
