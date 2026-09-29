import ReinoArtigo from '@/components/reino/ReinoArtigo';

const DURANTE_O_DIA: { titulo: string; texto: string }[] = [
  {
    titulo: 'Uso de medicação',
    texto: 'Se você utiliza medicamentos regularmente, consulte seu médico sobre como eles podem afetar o sono.',
  },
  {
    titulo: 'Estimulantes',
    texto: 'Evite nicotina e cafeína, pois são substâncias que podem atrapalhar o início e a manutenção do sono.',
  },
  { titulo: 'Cochilos', texto: 'Caso precise cochilar, evite fazê-lo até seis horas antes de dormir.' },
  { titulo: 'Exercícios físicos', texto: 'Tente se exercitar pelo menos duas a três horas antes de ir para a cama.' },
  {
    titulo: 'Exposição à luz natural',
    texto:
      'Exponha-se regularmente à luz solar. Procure ficar ao menos 30 minutos por dia ao ar livre, preferencialmente pela manhã.',
  },
  {
    titulo: 'Alimentação',
    texto: 'Evite refeições grandes e consumo excessivo de líquidos nas horas próximas ao horário de dormir.',
  },
  {
    titulo: 'Atividades calmantes',
    texto: 'Crie um pequeno ritual noturno: ler um livro, ouvir música leve, escrever um diário ou simplesmente desacelerar.',
  },
  { titulo: 'Banho quente', texto: 'Um banho quente pode ajudar na sensação de relaxamento antes de deitar.' },
];

export default function GoodNightSleepArticle() {
  return (
    <ReinoArtigo
      titulo="Como ter uma boa noite de sono"
      sobre="As atividades do dia influenciam diretamente a qualidade do seu sono. Pequenos ajustes na rotina podem ajudar você a dormir melhor e acordar com sensação real de descanso."
      lugar="SOM.02 · Vale do Sono · leitura de 2 min"
      imagem="/images/reino/casa-800.webp"
      foco="20% 50%"
    >
      <section>
        <h2>Durante o dia</h2>
        <p>Bons hábitos durante o dia contribuem para um sono mais estável e restaurador.</p>
        <dl className="reino-artigo__habitos">
          {DURANTE_O_DIA.map((h) => (
            <div key={h.titulo}>
              <dt>{h.titulo}</dt>
              <dd>{h.texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Hora de dormir</h2>
        <p>Verifique se o ambiente do seu quarto favorece o sono.</p>
        <ul>
          <li>Mantenha o quarto escuro e bem ventilado.</li>
          <li>Evite dispositivos eletrônicos ou outras distrações no local onde você dorme.</li>
          <li>Se não adormecer após cerca de 20 minutos, levante-se e faça algo relaxante até sentir sono novamente.</li>
        </ul>
      </section>

      <section>
        <h2>Sono fora do ciclo</h2>
        <p>
          Em alguns dias, dormir bem é mais difícil. Além das orientações anteriores, outras ações podem ajudar nesses
          casos.
        </p>
        <ul>
          <li>Mantenha horários de sono consistentes sempre que possível.</li>
          <li>Exponha-se à luz clara durante o dia e evite luz intensa antes de dormir.</li>
          <li>Se não for possível escurecer o quarto, considere o uso de uma máscara de dormir.</li>
          <li>Ruído branco ou protetores de ouvido podem reduzir sons que atrapalham o sono.</li>
        </ul>
      </section>
    </ReinoArtigo>
  );
}
