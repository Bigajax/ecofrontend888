import ReinoArtigo from '@/components/reino/ReinoArtigo';

export default function SleepArticle() {
  return (
    <ReinoArtigo
      titulo="Como funciona o seu sono"
      sobre="Por que o cansaço aumenta ao longo do dia, as fases da noite e como saber se você dormiu o suficiente."
      lugar="SOM.02 · Vale do Sono · leitura de 2 min"
      imagem="/images/reino/vale-800.webp"
      foco="45% 50%"
    >
      <section>
        <h2>Pressão do sono ao longo do dia</h2>
        <p>
          Ao longo do dia, a pressão do sono aumenta gradualmente. Isso pode gerar cansaço, sonolência ou aquela sensação
          clara de que o corpo pede uma pausa. Essa pressão é um mecanismo natural que sinaliza o momento de descansar.
        </p>
      </section>

      <section>
        <h2>Sobre os estágios do sono</h2>
        <p>
          Existe certa confusão sobre o que realmente são os estágios do sono e como eles influenciam a qualidade do
          descanso. Pesquisadores ainda exploram como cada fase funciona e quais efeitos produz no corpo.
        </p>
        <p>
          Cada estágio é marcado por padrões específicos de ondas cerebrais que surgem enquanto você dorme. Os sonhos
          acontecem principalmente durante o estágio de Movimento Rápido dos Olhos (REM), enquanto o sono profundo exerce
          forte função restauradora.
        </p>
        <p>Durante a noite, é comum percorrer os diferentes estágios várias vezes, num ciclo contínuo.</p>
      </section>

      <section>
        <h2>Por que o sono é tão importante</h2>
        <p>
          O sono é um estado inconsciente e restaurador no qual várias funções do corpo mudam de ritmo ou entram em pausa
          para permitir processos essenciais. Embora você possa não se lembrar de tudo ao acordar, passa aproximadamente um
          terço da vida nesse estado.
        </p>
        <p>
          Dormir bem faz uma diferença profunda no organismo. O corpo realiza manutenção em sistemas vitais: memória,
          hormônios, imunidade, aprendizado e muito mais. Também auxilia o coração, reduz a pressão arterial e fortalece a
          capacidade de combater infecções.
        </p>
        <p>Dormir menos do que o necessário pode prejudicar todas essas áreas.</p>
      </section>

      <section>
        <h2>Como saber se você dormiu o suficiente</h2>
        <p>
          Um bom indicador é a forma como você se sente ao acordar. Se desperta descansado e com sensação de recuperação,
          provavelmente dormiu o necessário.
        </p>
        <p>
          A quantidade ideal varia de pessoa para pessoa. De forma geral, adultos costumam precisar de 7 a 8 horas de sono
          por noite, mas esse número pode mudar conforme idade, rotina e necessidades individuais.
        </p>
      </section>
    </ReinoArtigo>
  );
}
