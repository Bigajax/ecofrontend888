import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AnimatedSection from '@/components/AnimatedSection';

export default function GoodNightSleepArticle() {
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

        {/* Cover Image */}
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img
            src="/images/good-night-sleep.jpg"
            alt="Como ter uma boa noite de sono"
            className="w-full h-auto"
          />
        </div>

        {/* Section 1: Introdução */}
        <AnimatedSection animation="slide-up-fade">
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Como ter uma boa noite de sono
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-4">
            As atividades do dia influenciam diretamente a qualidade do seu sono. Pequenos ajustes na rotina podem ajudar você a dormir melhor e acordar com sensação real de descanso.
          </p>
        </section>
        </AnimatedSection>

        {/* Section 2: Durante o dia */}
        <AnimatedSection animation="slide-up-fade" delay={100}>
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Durante o dia
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-8">
            Bons hábitos durante o dia contribuem para um sono mais estável e restaurador.
          </p>

          {/* Image after description */}
          <div className="mb-8 overflow-hidden rounded-2xl">
            <img
              src="/images/article-bedtime-hero.jpg"
              alt="Durante o dia"
              className="w-full h-auto"
            />
          </div>

          {/* Daytime Tips */}
          <div className="space-y-8">
            {/* Tip 1: Medicação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-2.png"
                  alt="Medicação"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Uso de medicação
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Se você utiliza medicamentos regularmente, consulte seu médico sobre como eles podem afetar o sono.
                </p>
              </div>
            </div>

            {/* Tip 2: Estimulantes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-1.png"
                  alt="Estimulantes"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Estimulantes
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Evite nicotina e cafeína, pois são substâncias que podem atrapalhar o início e a manutenção do sono.
                </p>
              </div>
            </div>

            {/* Tip 3: Cochilos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-3.png"
                  alt="Cochilos"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Cochilos
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Caso precise cochilar, evite fazê-lo até seis horas antes de dormir.
                </p>
              </div>
            </div>

            {/* Tip 4: Exercícios físicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-4.png"
                  alt="Exercícios"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Exercícios físicos
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Tente se exercitar pelo menos duas a três horas antes de ir para a cama.
                </p>
              </div>
            </div>

            {/* Tip 5: Exposição à luz natural */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-7.png"
                  alt="Luz natural"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Exposição à luz natural
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Exponha-se regularmente à luz solar. Procure ficar ao menos 30 minutos por dia ao ar livre, preferencialmente pela manhã.
                </p>
              </div>
            </div>

            {/* Tip 6: Alimentação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-6.png"
                  alt="Alimentação"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Alimentação
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Evite refeições grandes e consumo excessivo de líquidos nas horas próximas ao horário de dormir.
                </p>
              </div>
            </div>

            {/* Tip 7: Atividades calmantes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-8.png"
                  alt="Atividades calmantes"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Atividades calmantes
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Crie um pequeno ritual noturno: ler um livro, ouvir música leve, escrever um diário ou simplesmente desacelerar.
                </p>
              </div>
            </div>

            {/* Tip 8: Banho quente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex justify-center md:col-span-1">
                <img
                  src="/images/sleep-icon-9.png"
                  alt="Banho quente"
                  className="w-24 h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="font-display text-lg font-normal text-[var(--eco-text)] mb-2">
                  Banho quente
                </h3>
                <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                  Um banho quente pode ajudar na sensação de relaxamento antes de deitar.
                </p>
              </div>
            </div>

          </div>
        </section>
        </AnimatedSection>

        {/* Section 3: Hora de dormir */}
        <AnimatedSection animation="slide-up-fade" delay={200}>
        <section className="mb-10">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
            Hora de dormir
          </h2>
          <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-6">
            Verifique se o ambiente do seu quarto favorece o sono.
          </p>

          {/* Bedtime Environment Image */}
          <div className="mb-8 overflow-hidden rounded-2xl">
            <img
              src="/images/sleep-night-hero.jpg"
              alt="Ambiente para dormir"
              className="w-full h-auto"
            />
          </div>

          {/* Bedtime Tips */}
          <div className="space-y-4 mb-8">
            <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
              Mantenha o quarto escuro e bem ventilado.
            </p>
            <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
              Evite dispositivos eletrônicos ou outras distrações no local onde você dorme.
            </p>
            <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
              Se não adormecer após cerca de 20 minutos, levante-se e faça algo relaxante até sentir sono novamente.
            </p>
          </div>
        </section>
        </AnimatedSection>

        {/* Section 4: Sono fora do ciclo */}
        <AnimatedSection animation="slide-up-fade" delay={300}>
        <section className="mb-16">
          <div>
            <h2 className="font-display text-2xl font-normal text-[var(--eco-text)] mb-4">
              Sono fora do ciclo
            </h2>
            <p className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed mb-6">
              Em alguns dias, dormir bem é mais difícil. Além das orientações anteriores, outras ações podem ajudar nesses casos.
            </p>

            <ul className="space-y-4 list-disc list-inside">
              <li className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                Mantenha horários de sono consistentes sempre que possível.
              </li>
              <li className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                Exponha-se à luz clara durante o dia e evite luz intensa antes de dormir.
              </li>
              <li className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                Se não for possível escurecer o quarto, considere o uso de uma máscara de dormir.
              </li>
              <li className="text-[15px] text-[var(--eco-text)]/80 leading-relaxed">
                Ruído branco ou protetores de ouvido podem reduzir sons que atrapalham o sono.
              </li>
            </ul>
          </div>
        </section>
        </AnimatedSection>
      </main>
    </div>
  );
}
