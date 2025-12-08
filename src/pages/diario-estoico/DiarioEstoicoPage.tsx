import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';

interface DailyMaxim {
  date: string;
  month: string;
  dayNumber: number;
  title: string;
  subtitle?: string;
  text: string;
  author: string;
  background?: string;
}

// Imagens rotativas para as reflexões de dezembro
const DECEMBER_BACKGROUNDS = [
  'url("/images/meditacao-19-nov.webp")',
  'url("/images/meditacao-20-nov.webp")',
  'url("/images/meditacao-21-nov.webp")',
];

// Reflexões de dezembro (8 a 27)
const DECEMBER_REFLECTIONS: DailyMaxim[] = [
  {
    date: '8 de dezembro',
    month: 'dezembro',
    dayNumber: 8,
    title: 'Não se esconda dos seus sentimentos',
    text: 'É melhor dominar a dor que enganá-la.',
    author: 'Sêneca, Consolação a Minha Mãe Hélvia, 17.1B',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '9 de dezembro',
    month: 'dezembro',
    dayNumber: 9,
    title: 'Perdulários do tempo',
    text: 'Caso todos os gênios da história se concentrassem neste único assunto, nunca poderiam expressar plenamente sua perplexidade diante da obscuridade da mente humana. Nenhuma pessoa abandonaria sequer uma polegada de sua propriedade, e a menor das brigas com um vizinho pode significar o inferno para pagar; no entanto, deixamos facilmente outros invadirem nossa vida — pior, muitas vezes abrimos caminho para aqueles que vão controlá-la. Ninguém distribui seu dinheiro aos transeuntes, mas a quantos cada um de nós distribuímos nossa vida? Somos sovinas com propriedade e dinheiro, no entanto damos pouquíssima importância à perda de tempo, a coisa em relação à qual deveríamos ser os mais duros avarentos.',
    author: 'Sêneca, Sobre a Brevidade da Vida, 3.1–2',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '10 de dezembro',
    month: 'dezembro',
    dayNumber: 10,
    title: 'Não se venda por um preço muito baixo',
    text: 'Eu digo: que ninguém me roube um único dia sem que vá fazer uma devolução completa da perda.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 1.11B',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '11 de dezembro',
    month: 'dezembro',
    dayNumber: 11,
    title: 'Dignidade e coragem',
    text: 'Como diz Cícero, detestamos gladiadores se eles se apressam a salvar a própria vida a todo custo; nós os preferimos se mostram desprezo pela vida.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 11.4B',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '12 de dezembro',
    month: 'dezembro',
    dayNumber: 12,
    title: 'A batida continua',
    text: 'Percorre a longa galeria do passado, de impérios e reinos sucedendo-se uns aos outros incontáveis vezes. E podes também ver o futuro, pois certamente ele será igual, sem tirar nem pôr, incapaz de se desviar do ritmo atual. É tudo uma só coisa, quer tenhas experimentado quarenta anos, quer tenha sido uma era. O que mais há para ver?',
    author: 'Marco Aurélio, Meditações, 7.49',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '13 de dezembro',
    month: 'dezembro',
    dayNumber: 13,
    title: 'É só um número',
    text: 'Não estás aborrecido porque tens um certo peso e não o dobro. Então por que ficar nervoso porque te foi dado um certo tempo de vida e não mais? Assim como estás satisfeito com teu peso, assim também deverias estar com o tempo que te foi dado.',
    author: 'Marco Aurélio, Meditações, 6.49',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '14 de dezembro',
    month: 'dezembro',
    dayNumber: 14,
    title: 'O que deveríamos saber no fim',
    text: 'Logo vais morrer, e ainda assim não és sincero, sereno ou livre da desconfiança de que coisas externas podem prejudicá-lo; tampouco és indulgente com todos, ciente de que sabedoria e agir com justiça são uma só e mesma coisa.',
    author: 'Marco Aurélio, Meditações, 4.37',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '15 de dezembro',
    month: 'dezembro',
    dayNumber: 15,
    title: 'Uma maneira simples de medir nossos dias',
    text: 'Esta é a marca da perfeição de caráter: passar cada dia como se fosse o último, sem exaltação, preguiça ou fingimento.',
    author: 'Marco Aurélio, Meditações, 7.69',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '16 de dezembro',
    month: 'dezembro',
    dayNumber: 16,
    title: 'Boa saúde perpétua',
    text: 'Eu te digo, tens somente de aprender a viver como a pessoa saudável o faz […] vivendo com completa confiança. Que confiança? A única que vale a pena ter, no que é confiável, desempenhado e não pode ser levado embora — tua escolha racional.',
    author: 'Epicteto, Discursos, 3.26.28B–24',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '17 de dezembro',
    month: 'dezembro',
    dayNumber: 17,
    title: 'Conhece a ti mesmo — antes que seja tarde demais',
    text: 'A morte pesa sobre uma pessoa que, extremamente bem conhecida por todos, morre desconhecida para si mesma.',
    author: 'Sêneca, Tieste, 400',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '18 de dezembro',
    month: 'dezembro',
    dayNumber: 18,
    title: 'O que chega para todos nós',
    text: 'Tanto Alexandre, o Grande, quanto seu condutor de mulas foram levados para o mesmo lugar pela morte — foram ou recebidos na razão generativa de todas as coisas, ou dispersados entre os átomos.',
    author: 'Marco Aurélio, Meditações, 6.24',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '19 de dezembro',
    month: 'dezembro',
    dayNumber: 19,
    title: 'Escala humana',
    text: 'Pensa em todo o universo de matéria e em quão pequena é tua parte. Pensa sobre a extensão do tempo e em quão breve — quase momentânea — é a parte destinada a ti. Pensa nos funcionamentos da sorte e em quão infinitesimal é teu papel.',
    author: 'Marco Aurélio, Meditações, 5.24',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '20 de dezembro',
    month: 'dezembro',
    dayNumber: 20,
    title: 'Tema: o medo da morte',
    text: 'Ponderas então como o supremo dos males humanos, a marca mais segura dos vis e covardes, não é a morte, mas o medo da morte? Exorto-te a te disciplinares contra tal medo, a dirigires todo o teu pensamento, exercícios e leitura nesse sentido — e conhecerás o único caminho para a liberdade humana.',
    author: 'Epicteto, Discursos, 3.26.38–39',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '21 de dezembro',
    month: 'dezembro',
    dayNumber: 21,
    title: 'O que todos os seus anos de vida têm para mostrar?',
    text: 'Muitas vezes um velho não tem outra evidência além de sua idade para provar que viveu longo tempo.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 3.8B',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '22 de dezembro',
    month: 'dezembro',
    dayNumber: 22,
    title: 'Faça sua própria afirmação',
    text: 'Pois é vergonhoso para uma pessoa idosa, ou que se aproxima da velhice, ter apenas o conhecimento carregado em seus cadernos. Zenão disse isso… O que tu dizes? Cleanthes disse isso… O que tu dizes? Por quanto tempo serás compelido pelas afirmações de outrem? Assume o controle e le faz tua própria afirmação — algo que a posteridade vá carregar em seu caderno.',
    author: 'Sêneca, Cartas Morais, 33.7',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '23 de dezembro',
    month: 'dezembro',
    dayNumber: 23,
    title: 'O que você tem tanto medo de perder?',
    text: 'Tens medo de morrer. Mas, vamos lá, em que essa tua vida é algo diferente da morte?',
    author: 'Sêneca, Cartas Morais, 77.18',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '24 de dezembro',
    month: 'dezembro',
    dayNumber: 24,
    title: 'Sem sentido… como um bom vinho',
    text: 'Sabes que sabor têm vinho e licor. Não faz diferença se cem ou mil garrafas passam pela tua bexiga — tu não és mais que um filtro.',
    author: 'Sêneca, Cartas Morais, 77.16',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '25 de dezembro',
    month: 'dezembro',
    dayNumber: 25,
    title: 'Não queime a vela pelas duas pontas',
    text: 'A mente deve poder descansar — ela se levantará melhor e mais aguçada após uma boa pausa. Assim como campos ricos não devem ser forçados — pois rapidamente perderão sua fertilidade se nunca lhes for dada uma pausa —, assim também o trabalho constante na bigorna fraturará a força da mente. Mas ela recupera seus poderes se for deixada livre e descansada por algum tempo. Trabalho constante dá origem a um certo tipo de entorpecimento e debilidade da alma racional.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 17.5',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '26 de dezembro',
    month: 'dezembro',
    dayNumber: 26,
    title: 'A vida é longa — se você souber usá-la',
    text: 'Não se trata nem um pouco de termos um tempo de vida curto demais, mas de desperdiçarmos uma grande parte dele. A vida é bastante longa, e é dada em medida suficiente para fazermos grandes coisas se a aproveitarmos bem. Mas quando ela é escoada pelo ralo do luxo e da negligência, quando não é empregada para nenhuma boa finalidade, somos compelidos a perceber que ela passou antes mesmo que reconhecêssemos que estava passando. E assim é — nós é que recebemos uma vida curta, nós a tornamos curta.',
    author: 'Sêneca, Sobre a Brevidade da Vida, 1.3–4A',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '27 de dezembro',
    month: 'dezembro',
    dayNumber: 27,
    title: 'Não deixe sua alma ir antes',
    text: 'É uma desgraça nesta vida quando a alma se rende primeiro, enquanto o corpo se recusa a fazê-lo.',
    author: 'Marco Aurélio, Meditações, 6.29',
    background: DECEMBER_BACKGROUNDS[1],
  },
];

// Array de máximas diárias com datas específicas
const ALL_DAILY_MAXIMS: DailyMaxim[] = [
  ...DECEMBER_REFLECTIONS,
];

// Função para obter os últimos 3 dias (hoje e os 2 dias anteriores)
const getAvailableMaxims = (): DailyMaxim[] => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dez
  const currentDay = now.getDate();

  // Filtrar reflexões válidas para dezembro (mês 11)
  if (currentMonth === 11) { // Dezembro
    // Calcular os 3 dias: hoje, ontem e anteontem
    const threeDaysAgo = currentDay - 2;

    // Filtrar reflexões para esses 3 dias específicos
    const validReflections = ALL_DAILY_MAXIMS.filter(
      maxim =>
        maxim.month === 'dezembro' &&
        maxim.dayNumber >= threeDaysAgo &&
        maxim.dayNumber <= currentDay &&
        maxim.dayNumber >= 8 && // Garantir que não mostre antes do dia 8
        maxim.dayNumber <= 27  // Garantir que não mostre depois do dia 27
    );

    // Retornar ordenado por data crescente
    return validReflections.sort((a, b) => a.dayNumber - b.dayNumber);
  }

  // Se não for dezembro, retornar array vazio (trigger fallback)
  return [];
};

export default function DiarioEstoicoPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // Obter apenas os cards disponíveis até hoje
  const availableMaxims = getAvailableMaxims();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };

  const toggleExpanded = (dayNumber: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber);
      } else {
        newSet.add(dayNumber);
      }
      return newSet;
    });
  };

  // Forçar fundo branco em todo o documento
  useEffect(() => {
    // Salvar estilos originais
    const originalHtmlBg = document.documentElement.style.cssText;
    const originalBodyBg = document.body.style.cssText;

    // Forçar branco com !important
    document.documentElement.setAttribute('style', 'background: #ffffff !important; background-color: #ffffff !important; background-image: none !important;');
    document.body.setAttribute('style', 'background: #ffffff !important; background-color: #ffffff !important; background-image: none !important;');

    return () => {
      // Restaurar estilos originais
      document.documentElement.setAttribute('style', originalHtmlBg);
      document.body.setAttribute('style', originalBodyBg);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      width: '100%'
    }}>
      <div className="w-full min-h-full">
        {/* Header */}
        <HomeHeader onLogout={handleLogout} />

        {/* Main Content */}
        <main className="w-full px-4 py-8 md:px-8 md:py-12">
          {/* Grid de cards */}
          <div className="mx-auto max-w-7xl">
            {availableMaxims.length === 0 ? (
              // Fallback quando não há reflexões disponíveis
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md px-6">
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Hoje não há reflexão cadastrada. Em breve teremos mais.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableMaxims.map((maxim) => {
                const isExpanded = expandedCards.has(maxim.dayNumber);

                return (
                  <AnimatedSection key={maxim.dayNumber} animation="slide-up-fade">
                    <div
                      className="relative w-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-3xl"
                      style={{
                        backgroundImage: maxim.background,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {/* Overlay sempre presente */}
                      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

                      {/* Content - parte superior fixa */}
                      <div className="relative flex flex-col min-h-[400px] justify-between p-6 md:p-8">
                        {/* Top: Date Badge */}
                        <div>
                          <span className="inline-flex rounded-full px-4 py-2 backdrop-blur-sm bg-gray-600/70">
                            <span className="text-[12px] font-medium text-white">
                              {maxim.date}
                            </span>
                          </span>
                        </div>

                        {/* Middle: Title */}
                        <div className="space-y-4">
                          <p className="font-display font-normal leading-relaxed text-xl md:text-2xl text-white drop-shadow-lg">
                            {maxim.title}
                          </p>

                          {/* Botão - Leia mais ou Fechar */}
                          <button
                            onClick={() => toggleExpanded(maxim.dayNumber)}
                            className="inline-flex items-center gap-2 text-[13px] font-medium transition-all rounded-full px-4 py-2 text-white bg-gray-600/60 hover:bg-gray-600/80 backdrop-blur-sm"
                          >
                            <MoreHorizontal size={16} />
                            {isExpanded ? 'Fechar' : 'Leia mais'}
                          </button>
                        </div>

                        {/* Bottom: Empty space for alignment */}
                        <div />
                      </div>

                      {/* Conteúdo expandido - aparece embaixo */}
                      {isExpanded && (
                        <div className="relative bg-white p-6 md:p-8 border-t border-gray-200">
                          <div className="space-y-4">
                            <p className="text-[15px] leading-relaxed text-gray-700 italic">
                              "{maxim.text}"
                            </p>
                            <p className="text-[13px] font-medium text-gray-600">
                              — {maxim.author}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </AnimatedSection>
                );
              })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
