import { LinhaDoCaminho } from '@/components/reino/CaminhoNoReino';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRitualProgress, type RitualProgress } from '@/hooks/useRitualProgress';
import { trackRitualCardClicked, trackRitualCardViewed } from '@/lib/mixpanelRitualEvents';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { PincelProgresso, ReinoPintura, ReinoScene, type ReinoCrop, type ReinoRegiao } from '@/components/reino/ReinoScene';
import { formatHojeLabel, getFirstName, getReinoMood, type ReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

const RITUAL_SOURCE = 'home_reino';
const TOTAL_NOITES = 7;

interface HomeReinoHeroProps {
  userName?: string | null;
  onStartChat: () => void;
  onDailyRecommendation: (recId: string) => void;
  onBlessing: (blessingId: string) => void;
  /** força um humor (testes e prévia); por padrão segue a hora de Brasília */
  mood?: ReinoMood;
}

interface ItemSumario {
  id: string;
  titulo: string;
  /** o que é, em palavras de todo dia (para quem chega pela primeira vez) */
  sobre: string;
  meta: string;
  progresso?: number;
  onClick: () => void;
}

/** Uma das 5 áreas do app, no índice fixo do fim do topo. */
interface Area {
  id: string;
  /** o que é, em palavras de todo dia: vem primeiro */
  titulo: string;
  /** o nome do lugar no reino: vem pequeno, embaixo */
  lugar: string;
  crop: ReinoCrop;
  onClick: () => void;
}

// Pintura do topo de cada humor, com o foco que mantém a pessoa pequena no quadro.
const CENA: Record<ReinoMood, { regiao: ReinoRegiao; foco: string }> = {
  amanhecer: { regiao: 'portico', foco: '85% 50%' }, // alguém lendo no Pórtico
  entardecer: { regiao: 'casa', foco: '15% 50%' }, // a janela acesa da Casa da Eco
  noite: { regiao: 'vale', foco: '45% 50%' }, // alguém sentado olhando a lua
};

function metaRitual(r: RitualProgress): string {
  switch (r.status) {
    case 'completed_today':
      return 'feito hoje';
    case 'all_done':
      return `${TOTAL_NOITES} de ${TOTAL_NOITES}`;
    default:
      return `noite ${r.nextNight} de ${TOTAL_NOITES}`;
  }
}

function comPonto(frase: string): string {
  const t = frase.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

export default function HomeReinoHero({
  userName,
  onStartChat,
  onDailyRecommendation,
  onBlessing,
  mood: moodProp,
}: HomeReinoHeroProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ritual = useRitualProgress(user?.id || 'guest');
  const mood = moodProp ?? getReinoMood();
  const nome = getFirstName(userName);
  const hoje = formatHojeLabel();
  const reflexao = useMemo(() => getTodayMaxim(), []);

  const abrirDiario = () => {
    sessionStorage.setItem('diario_entry_source', RITUAL_SOURCE);
    navigate('/app/diario-estoico');
  };

  const abrirRitual = () => {
    trackRitualCardClicked({
      userId: user?.id,
      progressStatus: ritual.status,
      currentNight: ritual.nextNight,
      currentStep: ritual.completedCount,
      source: RITUAL_SOURCE,
    });
    navigate('/app/meditacoes-sono');
  };

  // "Card visto" do Ritual: 1× quando a home abre no humor da noite.
  const ritualVistoRef = useRef(false);
  useEffect(() => {
    if (mood !== 'noite' || ritualVistoRef.current) return;
    ritualVistoRef.current = true;
    trackRitualCardViewed({
      userId: user?.id,
      progressStatus: ritual.status,
      currentNight: ritual.nextNight,
      currentStep: ritual.completedCount,
      source: RITUAL_SOURCE,
    });
  }, [mood, ritual, user?.id]);

  const irSono = () => navigate('/app/meditacoes-sono');
  const irSonhos = () => navigate('/app/dream');
  const irTrilhas = () => navigate('/app/programas');

  const conversar: ItemSumario = {
    id: 'eco',
    titulo: 'Conversar com a Eco',
    sobre: 'Conte como você está. A Eco escuta e responde.',
    meta: 'quando quiser',
    onClick: onStartChat,
  };
  const respirar: ItemSumario = {
    id: 'respirar',
    titulo: 'Respirar',
    sobre: 'Uma pausa guiada para acalmar o corpo.',
    meta: '7 min',
    onClick: () => onDailyRecommendation('rec_2'),
  };

  const conteudo: Record<
    ReinoMood,
    { ola: string; pergunta: string; placa: string; onPlaca: () => void; secao: string; itens: ItemSumario[] }
  > = {
    amanhecer: {
      ola: nome ? `Bom dia, ${nome}.` : 'Bom dia.',
      pergunta: comPonto(reflexao?.title || 'Veja as coisas como realmente são'),
      placa: 'Ler a reflexão de hoje',
      onPlaca: abrirDiario,
      secao: 'Para esta manhã',
      itens: [
        {
          id: 'reflexao',
          titulo: 'A reflexão do Pórtico',
          sobre: 'Uma frase estoica e um comentário curto para levar ao dia.',
          meta: 'leitura',
          onClick: abrirDiario,
        },
        {
          id: 'rotina',
          titulo: 'Rotina matinal',
          sobre: 'Meditação guiada para começar o dia.',
          meta: '8 min',
          onClick: () => onDailyRecommendation('rec_1'),
        },
        conversar,
      ],
    },
    entardecer: {
      ola: 'O dia está baixando.',
      pergunta: 'O que vale levar com você?',
      placa: 'Entrar na Casa da Eco',
      onPlaca: onStartChat,
      secao: 'Para o fim da tarde',
      itens: [
        conversar,
        respirar,
        {
          id: 'drjoe',
          titulo: 'Desperte seu potencial interior',
          sobre: 'Meditações guiadas do Dr. Joe Dispenza.',
          meta: '5 meditações',
          onClick: () => onBlessing('drjoe_collection'),
        },
      ],
    },
    noite: {
      ola: nome ? `Boa noite, ${nome}.` : 'Boa noite.',
      pergunta: 'O que ainda está fazendo barulho aí dentro?',
      placa: 'Entrar na Casa da Eco',
      onPlaca: onStartChat,
      secao: 'Para esta noite',
      itens: [
        {
          id: 'ritual',
          titulo: 'Ritual Boa Noite',
          sobre: 'Sete noites para desacelerar antes de dormir.',
          meta: metaRitual(ritual),
          progresso: ritual.completedCount / TOTAL_NOITES,
          onClick: abrirRitual,
        },
        respirar,
        {
          id: 'adormeca',
          titulo: 'Adormeça sem carregar o dia',
          sobre: 'Meditação para soltar o dia e pegar no sono.',
          meta: '9 min',
          onClick: () => onBlessing('blessing_8'),
        },
      ],
    },
  };

  const c = conteudo[mood];

  // Índice fixo: as 5 áreas, sempre as mesmas e na mesma ordem, em qualquer hora.
  // O nome simples vem primeiro; o nome do lugar no reino fica pequeno embaixo.
  const areas: Area[] = [
    { id: 'casa', titulo: 'Conversar com a Eco', lugar: 'Casa da Eco', crop: [0, 190, 460, 460], onClick: onStartChat },
    { id: 'vale', titulo: 'Dormir melhor', lugar: 'Vale do Sono', crop: [430, 190, 460, 460], onClick: irSono },
    { id: 'lago', titulo: 'Entender um sonho', lugar: 'Lago dos Sonhos', crop: [880, 190, 460, 460], onClick: irSonhos },
    { id: 'trilhas', titulo: 'Programas guiados', lugar: 'As Trilhas', crop: [1300, 190, 460, 460], onClick: irTrilhas },
    { id: 'portico', titulo: 'Reflexão do dia', lugar: 'O Pórtico', crop: [1712, 190, 460, 460], onClick: abrirDiario },
  ];

  return (
    <section className="reino-hero" data-mood={mood} aria-labelledby="reino-ola">
      <div className="reino-hero__grade">
        <div className="reino-hero__cena reino-rasgo-a">
          <ReinoPintura regiao={CENA[mood].regiao} foco={CENA[mood].foco} />

        </div>

        <div className="reino-hero__texto">
          <p className="reino-rotulo">{hoje}</p>
          <h1 id="reino-ola" className="reino-hero__ola">
            {c.ola}
          </h1>
          <p className="reino-hero__pergunta">{c.pergunta}</p>
          <button type="button" className="reino-placa" onClick={c.onPlaca}>
            {c.placa} <span aria-hidden="true">→</span>
          </button>

          {/* O caminho no reino: quantos dias de prática e o próximo marco */}
          <LinhaDoCaminho className="reino-hero__caminho" />

          <h2 className="reino-rotulo reino-hero__secao">{c.secao}</h2>
          <ol className="reino-sumario">
            {c.itens.map((item, i) => (
              <li key={item.id}>
                <button type="button" onClick={item.onClick} className="reino-sumario__item">
                  <span className="reino-sumario__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="reino-sumario__t">{item.titulo}</span>
                  <span className="reino-sumario__m">{item.meta}</span>
                  <span className="reino-sumario__d">{item.sobre}</span>
                  {item.progresso !== undefined && (
                    <PincelProgresso value={item.progresso} className="reino-sumario__pincel" />
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <nav className="reino-hero__lugares" aria-labelledby="reino-indice">
          <h2 id="reino-indice" className="reino-rotulo">Tudo o que tem aqui</h2>
          <ul className="reino-indice">
            {areas.map((area, i) => (
              <li key={area.id}>
                <button type="button" onClick={area.onClick} className="reino-indice__area">
                  <ReinoScene crop={area.crop} small className={i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'} />
                  <span className="reino-indice__texto">
                    <span className="reino-indice__titulo">{area.titulo}</span>
                    <span className="reino-indice__lugar">{area.lugar}</span>
                  </span>
                  <span className="reino-indice__entrar" aria-hidden="true">
                    entrar
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
