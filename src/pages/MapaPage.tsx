import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import { PANORAMA, ReinoPintura, ReinoScene, type ReinoCrop, type ReinoRegiao } from '@/components/reino/ReinoScene';
import '@/components/reino/reino.css';

interface Destino {
  titulo: string;
  meta?: string;
  to: string;
}

interface Regiao {
  id: string;
  nome: string;
  codigo: string;
  sobre: string;
  /** posição da etiqueta no panorama, em % */
  pino: { x: number; y: number };
  pintura?: { regiao: ReinoRegiao; foco: string };
  recorte?: ReinoCrop;
  destinos: Destino[];
}

// A ordem segue o caminho do panorama, da esquerda (entardecer) para a direita (amanhecer).
const REGIOES: Regiao[] = [
  {
    id: 'casa',
    nome: 'Casa da Eco',
    codigo: 'ECO.01 / 23°46′',
    sobre: 'Uma casa pequena com a janela acesa. Tem alguém acordado que pode ouvir.',
    pino: { x: 8, y: 34 },
    pintura: { regiao: 'casa', foco: '20% 50%' },
    destinos: [
      { titulo: 'Conversar com a Eco', to: '/app/chat' },
      { titulo: 'Memória emocional', meta: 'o que você já contou', to: '/app/memory' },
      { titulo: 'Perfil emocional', meta: 'seus temas', to: '/app/memory/profile' },
    ],
  },
  {
    id: 'vale',
    nome: 'Vale do Sono',
    codigo: 'SOM.02 / após 20h',
    sobre: 'Colinas em camadas sob as estrelas. É onde a noite acontece.',
    pino: { x: 30, y: 44 },
    pintura: { regiao: 'vale', foco: '40% 50%' },
    destinos: [
      { titulo: 'Ritual Boa Noite', meta: '7 noites', to: '/app/meditacoes-sono' },
      { titulo: 'Sons para dormir', to: '/app/sons' },
    ],
  },
  {
    id: 'lago',
    nome: 'Lago dos Sonhos',
    codigo: 'DRM.03 / profundidade desconhecida',
    sobre: 'Água parada que reflete a lua. Conte um sonho e receba uma leitura inspirada em Freud e Jung.',
    pino: { x: 53, y: 70 },
    recorte: [880, 150, 560, 560],
    destinos: [{ titulo: 'Contar um sonho', meta: 'Eco Dream', to: '/app/dream' }],
  },
  {
    id: 'trilhas',
    nome: 'As Trilhas',
    codigo: 'TRI.04 / percurso 07',
    sobre: 'Estradas de terra entre ciprestes. Cada jornada é um caminho com começo e chegada.',
    pino: { x: 79, y: 74 },
    pintura: { regiao: 'trilhas', foco: '70% 50%' },
    destinos: [
      { titulo: 'Jornadas e programas', to: '/app/programas' },
      { titulo: 'Desperte seu potencial interior', meta: '5 meditações', to: '/app/dr-joe-dispenza' },
      { titulo: 'Código da Abundância', meta: '7 dias', to: '/app/codigo-da-abundancia' },
      { titulo: '5 Anéis da Disciplina', to: '/app/rings' },
    ],
  },
  {
    id: 'portico',
    nome: 'O Pórtico',
    codigo: 'STO.05 / ao nascer do sol',
    sobre:
      'Os estoicos têm esse nome por causa da Stoa Poikile, o pórtico pintado de Atenas onde Zenão ensinava.',
    pino: { x: 91, y: 36 },
    pintura: { regiao: 'portico', foco: '85% 50%' },
    destinos: [{ titulo: 'Diário Estoico', meta: 'a reflexão de hoje', to: '/app/diario-estoico' }],
  },
];

export default function MapaPage() {
  const navigate = useNavigate();

  const irPara = (id: string) => {
    document.getElementById(`regiao-${id}`)?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="reino-corpo reino-mapa">
      <HomeHeader />

      <main className="page-with-nav">
        <div className="reino-mapa__abertura">
          <p className="reino-rotulo">5 regiões · 1 caminho</p>
          <h1 className="reino-mapa__titulo">O Mapa</h1>
          <p className="reino-corpo__sobre">Tudo o que existe na Ecotopia, no lugar onde mora.</p>
        </div>

        <div className="reino-mapa__rolo">
          <div className="reino-mapa__quadro">
            <img
              src={PANORAMA.src}
              width={PANORAMA.width}
              height={PANORAMA.height}
              alt="Panorama do reino: a casa ao entardecer, o vale e o lago sob a lua, as trilhas e o pórtico ao amanhecer."
            />
            {REGIOES.map((r, i) => (
              <button
                key={r.id}
                type="button"
                className="reino-mapa__pino"
                style={{ left: `${r.pino.x}%`, top: `${r.pino.y}%`, rotate: i % 2 ? '1deg' : '-1.2deg' }}
                onClick={() => irPara(r.id)}
              >
                <b>{r.nome}</b>
                <span>{r.codigo.split(' / ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <ol className="reino-mapa__atlas">
          {REGIOES.map((r, i) => (
            <li key={r.id} id={`regiao-${r.id}`} className="reino-mapa__regiao">
              <div className={`reino-mapa__imagem ${i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'}`}>
                {r.pintura ? (
                  <ReinoPintura regiao={r.pintura.regiao} foco={r.pintura.foco} />
                ) : (
                  r.recorte && <ReinoScene crop={r.recorte} />
                )}
              </div>
              <div className="reino-mapa__texto">
                <p className="reino-rotulo">{r.codigo}</p>
                <h2 className="reino-corpo__titulo">{r.nome}</h2>
                <p className="reino-corpo__sobre">{r.sobre}</p>
                <ol className="reino-sumario reino-mapa__destinos">
                  {r.destinos.map((d, j) => (
                    <li key={d.to}>
                      <button type="button" className="reino-sumario__item" onClick={() => navigate(d.to)}>
                        <span className="reino-sumario__n">{String(j + 1).padStart(2, '0')}</span>
                        <span className="reino-sumario__t">{d.titulo}</span>
                        <span className="reino-sumario__m">{d.meta ?? ''}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
