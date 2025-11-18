import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AnimatedSection from '@/components/AnimatedSection';

export default function SleepArticle() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--eco-bg)]">
      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app')}
          className="mb-8 flex items-center gap-2 text-[var(--eco-text)] transition-colors hover:text-[var(--eco-user)]"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        {/* Title */}
        <h1 className="font-display text-4xl font-normal text-[var(--eco-text)] mb-8">
          Artigo Sobre o Sono
        </h1>

        {/* First Image */}
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img
            src="/images/sleep-stages-intro.jpg"
            alt="Noite com lua"
            className="w-full h-auto"
          />
        </div>

        {/* Section 1: Pressão do Sono */}
        <AnimatedSection animation="slide-up-fade">
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Pressão do sono ao longo do dia
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            Ao longo do dia, a pressão do sono aumenta gradualmente. Isso pode gerar cansaço, sonolência ou aquela sensação clara de que o corpo pede uma pausa. Essa pressão é um mecanismo natural que sinaliza o momento de descansar.
          </p>
        </section>
        </AnimatedSection>

        {/* Second Image */}
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img
            src="/images/sleep-cycles.jpg"
            alt="Ciclos do sono"
            className="w-full h-auto"
          />
        </div>

        {/* Section 2: Estágios do Sono */}
        <AnimatedSection animation="slide-up-fade" delay={100}>
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Sobre os estágios do sono
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            Existe certa confusão sobre o que realmente são os estágios do sono e como eles influenciam a qualidade do descanso. Pesquisadores ainda exploram como cada fase funciona e quais efeitos produz no corpo.
          </p>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            Cada estágio é marcado por padrões específicos de ondas cerebrais que surgem enquanto você dorme. Os sonhos acontecem principalmente durante o estágio de Movimento Rápido dos Olhos (REM), enquanto o sono profundo exerce forte função restauradora.
          </p>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
            Durante a noite, é comum percorrer os diferentes estágios várias vezes, num ciclo contínuo.
          </p>
        </section>
        </AnimatedSection>

        {/* Section 3: Por que o sono é importante */}
        <AnimatedSection animation="slide-up-fade" delay={200}>
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Por que o sono é tão importante
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            O sono é um estado inconsciente e restaurador no qual várias funções do corpo mudam de ritmo ou entram em pausa para permitir processos essenciais. Embora você possa não se lembrar de tudo ao acordar, passa aproximadamente um terço da vida nesse estado.
          </p>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            Dormir bem faz uma diferença profunda no organismo. O corpo realiza manutenção em sistemas vitais: memória, hormônios, imunidade, aprendizado e muito mais. Também auxilia o coração, reduz a pressão arterial e fortalece a capacidade de combater infecções.
          </p>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
            Dormir menos do que o necessário pode prejudicar todas essas áreas.
          </p>
        </section>
        </AnimatedSection>

        {/* Section 4: Como saber se dormiu o suficiente */}
        <AnimatedSection animation="slide-up-fade" delay={300}>
        <section className="mb-16">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Como saber se você dormiu o suficiente
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            Um bom indicador é a forma como você se sente ao acordar. Se desperta descansado e com sensação de recuperação, provavelmente dormiu o necessário.
          </p>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
            A quantidade ideal varia de pessoa para pessoa. De forma geral, adultos costumam precisar de 7 a 8 horas de sono por noite, mas esse número pode mudar conforme idade, rotina e necessidades individuais.
          </p>
        </section>
        </AnimatedSection>
      </main>
    </div>
  );
}
