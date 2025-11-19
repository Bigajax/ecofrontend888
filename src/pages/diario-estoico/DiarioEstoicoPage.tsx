import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';

interface DailyMaxim {
  date: string;
  dayNumber: number;
  title: string;
  text: string;
  author: string;
  background?: string;
}

// Array de máximas diárias com datas específicas
const ALL_DAILY_MAXIMS: DailyMaxim[] = [
  {
    date: 'Novembro 17',
    dayNumber: 17,
    title: 'A FORÇA DA ADVERSIDADE',
    text: 'O obstáculo no caminho se torna o caminho. Nunca esqueça, em cada impedimento há uma oportunidade para praticar outra virtude.',
    author: 'MARCO AURÉLIO',
    background: 'url("/images/meditacao-20-nov.png")',
  },
  {
    date: 'Novembro 18',
    dayNumber: 18,
    title: 'O CONTROLE INTERIOR',
    text: 'A felicidade da sua vida depende da qualidade dos seus pensamentos.',
    author: 'MARCO AURÉLIO',
    background: 'url("/images/meditacao-21-nov.png")',
  },
  {
    date: 'Novembro 19',
    dayNumber: 19,
    title: 'MÁXIMAS DE TRÊS HOMENS SÁBIOS',
    text: 'Para qualquer desafio, deveríamos ter três pensamentos ao nosso dispor: "Conduzam Deus e Destino, Para aquela Meta fixada para mim há muito. Seguirei e não tropeçarei; mesmo que minha vontade seja fraca, eu me manterei firme."',
    author: 'CLEANTES',
    background: 'url("/images/meditacao-19-nov.png")',
  },
  {
    date: 'Novembro 20',
    dayNumber: 20,
    title: 'O PODER DO PENSAMENTO',
    text: 'Você tem poder sobre sua mente - não sobre eventos externos. Perceba isso, e você encontrará força.',
    author: 'MARCO AURÉLIO',
    background: 'url("/images/meditacao-20-nov.png")',
  },
  {
    date: 'Novembro 21',
    dayNumber: 21,
    title: 'A VIRTUDE DA REFLEXÃO',
    text: 'O pensamento profundo e a contemplação são o caminho para a verdadeira sabedoria.',
    author: 'SÊNECA',
    background: 'url("/images/meditacao-21-nov.png")',
  },
];

// Função para obter os últimos 3 dias (hoje e os 2 dias anteriores)
const getAvailableMaxims = (): DailyMaxim[] => {
  const today = new Date().getDate(); // Dia atual (19, 20, 21, etc)
  const twoDaysAgo = today - 2; // 2 dias atrás

  return ALL_DAILY_MAXIMS
    .filter(maxim => maxim.dayNumber >= twoDaysAgo && maxim.dayNumber <= today)
    .sort((a, b) => a.dayNumber - b.dayNumber); // Ordenar por data crescente
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
          </div>
        </main>
      </div>
    </div>
  );
}
