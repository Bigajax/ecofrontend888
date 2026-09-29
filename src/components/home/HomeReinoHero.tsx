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
  meta: string;
  progresso?: number;
  onClick: () => void;
}

interface Lugar {
  id: string;
  nome: string;
  codigo: string;
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

  const conversar: ItemSumario = { id: 'eco', titulo: 'Conversar com a Eco', meta: 'ECO.01', onClick: onStartChat };
  const respirar: ItemSumario = {
    id: 'respirar',
    titulo: 'Respirar',
    meta: '7 min',
    onClick: () => onDailyRecommendation('rec_2'),
  };

  const conteudo: Record<
    ReinoMood,
    { ola: string; pergunta: string; placa: string; onPlaca: () => void; secao: string; itens: ItemSumario[]; lugares: Lugar[] }
  > = {
    amanhecer: {
      ola: nome ? `Bom dia, ${nome}.` : 'Bom dia.',
      pergunta: comPonto(reflexao?.title || 'Veja as coisas como realmente são'),
      placa: 'Ler a reflexão de hoje',
      onPlaca: abrirDiario,
      secao: 'Para esta manhã',
      itens: [
        { id: 'reflexao', titulo: 'A reflexão do Pórtico', meta: 'STO.05', onClick: abrirDiario },
        { id: 'rotina', titulo: 'Rotina matinal', meta: '8 min', onClick: () => onDailyRecommendation('rec_1') },
        conversar,
      ],
      lugares: [
        { id: 'lago', nome: 'Lago dos Sonhos', codigo: 'DRM.03', crop: [792, 190, 460, 460], onClick: irSonhos },
        { id: 'trilhas', nome: 'As Trilhas', codigo: 'TRI.04', crop: [1252, 190, 460, 460], onClick: irTrilhas },
        { id: 'portico', nome: 'O Pórtico', codigo: 'STO.05', crop: [1712, 190, 460, 460], onClick: abrirDiario },
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
          meta: '5 meditações',
          onClick: () => onBlessing('drjoe_collection'),
        },
      ],
      lugares: [
        { id: 'casa', nome: 'Casa da Eco', codigo: 'ECO.01', crop: [0, 190, 460, 460], onClick: onStartChat },
        { id: 'vale', nome: 'Vale do Sono', codigo: 'SOM.02', crop: [460, 190, 460, 460], onClick: irSono },
        { id: 'lago', nome: 'Lago dos Sonhos', codigo: 'DRM.03', crop: [920, 190, 460, 460], onClick: irSonhos },
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
          meta: metaRitual(ritual),
          progresso: ritual.completedCount / TOTAL_NOITES,
          onClick: abrirRitual,
        },
        respirar,
        {
          id: 'adormeca',
          titulo: 'Adormeça sem carregar o dia',
          meta: '9 min',
          onClick: () => onBlessing('blessing_8'),
        },
      ],
      lugares: [
        { id: 'vale', nome: 'Vale do Sono', codigo: 'SOM.02', crop: [430, 190, 460, 460], onClick: irSono },
        { id: 'lago', nome: 'Lago dos Sonhos', codigo: 'DRM.03', crop: [890, 190, 460, 460], onClick: irSonhos },
        { id: 'trilhas', nome: 'As Trilhas', codigo: 'TRI.04', crop: [1350, 190, 460, 460], onClick: irTrilhas },
      ],
    },
  };

  const c = conteudo[mood];

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

          <h2 className="reino-rotulo reino-hero__secao">{c.secao}</h2>
          <ol className="reino-sumario">
            {c.itens.map((item, i) => (
              <li key={item.id}>
                <button type="button" onClick={item.onClick} className="reino-sumario__item">
                  <span className="reino-sumario__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="reino-sumario__t">{item.titulo}</span>
                  <span className="reino-sumario__m">{item.meta}</span>
                  {item.progresso !== undefined && (
                    <PincelProgresso value={item.progresso} className="reino-sumario__pincel" />
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="reino-hero__lugares">
          <h2 className="reino-rotulo">Lugares por perto</h2>
          <ul className="reino-horizonte">
            {c.lugares.map((lugar, i) => (
              <li key={lugar.id}>
                <button type="button" onClick={lugar.onClick} className="reino-horizonte__lugar">
                  <ReinoScene crop={lugar.crop} small className={i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'} />
                  <span className="reino-horizonte__nome">{lugar.nome}</span>
                  <span className="reino-horizonte__codigo">{lugar.codigo}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
