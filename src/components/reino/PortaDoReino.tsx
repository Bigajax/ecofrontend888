import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import mixpanel from '@/lib/mixpanel';
import { estadoDoCaminho, lerDiasDePratica } from '@/utils/caminhoReino';
import { EVENTO_PORTA, type DetalhePorta } from '@/utils/porta';
import { Astro, PincelProgresso } from './ReinoScene';
import { getReinoMood } from './reinoMood';
import './reino.css';

/**
 * A Porta do reino (set/2026): o pedido de assinatura como "não perca o que
 * você construiu". Antes, todo bloqueio do app mandava direto para o
 * /assinar, sem dizer nada do que a pessoa já tinha feito. Agora abre esta
 * folha com o caminho dela até aqui e só então o convite.
 *
 * Aberta por abrirPorta(origem) (requestUpgrade usa isso). Fica montada no App.
 */

interface Conquista {
  texto: string;
}

function lerJson<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

/** O que a pessoa já fez, lido do aparelho. Só entra o que é maior que zero. */
function conquistas(uid: string | null): Conquista[] {
  const lista: Conquista[] = [];

  const aneis = lerJson<Array<{ status?: string; date?: string }>>(`eco.rings.v1.rituals.${uid || 'anon'}`, []);
  const diasAneis = new Set(aneis.filter((r) => r?.status === 'completed').map((r) => r.date)).size;
  if (diasAneis > 0) lista.push({ texto: `${diasAneis} ${diasAneis === 1 ? 'dia' : 'dias'} nos Cinco Anéis` });

  const intro = lerJson<Array<{ completed?: boolean }>>(`eco.introducao.meditations.v2.${uid || 'guest'}`, []);
  const introFeitas = Array.isArray(intro) ? intro.filter((m) => m?.completed).length : 0;
  if (introFeitas > 0) lista.push({ texto: `${introFeitas} de 5 pedras dos Primeiros passos` });

  const sono = lerJson<{ completedNights?: number[] }>(`eco.sono.protocol.v1.${uid || 'guest'}`, {});
  const noites = Array.isArray(sono.completedNights) ? sono.completedNights.length : 0;
  if (noites > 0) lista.push({ texto: `${noites} de 7 noites do Protocolo do Sono` });

  const drJoe = lerJson<Array<{ completed?: boolean }>>(`eco.drJoe.meditations.v1.${uid || 'guest'}`, []);
  const drJoeFeitas = Array.isArray(drJoe) ? drJoe.filter((m) => m?.completed).length : 0;
  if (drJoeFeitas > 0) lista.push({ texto: `${drJoeFeitas} de 5 dias de Desperte seu potencial` });

  return lista;
}

/** Título pela origem do pedido: diz o que vem a seguir, não "assine". */
function tituloPara(origem: string): string {
  if (origem.startsWith('rings')) return 'O próximo anel espera você.';
  if (origem.startsWith('introducao')) return 'As outras pedras da travessia.';
  if (origem.startsWith('dr_joe')) return 'Os próximos dias da jornada.';
  if (origem.startsWith('sono')) return 'As próximas noites.';
  if (origem.startsWith('voice')) return 'A conversa por voz com a Eco.';
  if (origem.startsWith('chat')) return 'A conversa não precisa parar.';
  if (origem.startsWith('memory') || origem.startsWith('relatorio')) return 'O seu perfil emocional inteiro.';
  if (origem.startsWith('diario')) return 'Todas as reflexões do Diário.';
  if (origem.startsWith('meditation')) return 'Esta meditação e todas as outras.';
  return 'Abra todas as portas do reino.';
}

export default function PortaDoReino() {
  const [origem, setOrigem] = useState<string | null>(null);

  useEffect(() => {
    const abrir = (e: Event) => {
      const detalhe = (e as CustomEvent<DetalhePorta>).detail;
      setOrigem(detalhe?.origem || 'porta');
    };
    window.addEventListener(EVENTO_PORTA, abrir);
    return () => window.removeEventListener(EVENTO_PORTA, abrir);
  }, []);

  if (!origem) return null;
  return <FolhaDaPorta origem={origem} onFechar={() => setOrigem(null)} />;
}

/** A folha da Porta: o caminho da pessoa até aqui e o convite. */
export function FolhaDaPorta({ origem, onFechar }: { origem: string; onFechar: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id ?? null;

  useEffect(() => {
    try {
      mixpanel.track('Porta · Vista', { origem });
    } catch {
      // medir nunca quebra a tela
    }
  }, [origem]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const caminho = estadoDoCaminho(lerDiasDePratica(uid).length);
  const feitos = conquistas(uid);
  const temCaminho = caminho.dias > 0 || feitos.length > 0;

  const abrirPortas = () => {
    try {
      mixpanel.track('Porta · Abrir todas', { origem, dias_no_reino: caminho.dias });
    } catch {
      // idem
    }
    const destino = origem;
    onFechar();
    navigate(`/assinar?step=plan&plan=monthly&from=${encodeURIComponent(destino)}`);
  };

  return (
    <div
      className="reino-gate reino-porta"
      role="dialog"
      aria-modal="true"
      aria-labelledby="porta-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="reino-gate__folha reino-corpo">
        <Astro className="reino-gate__astro" mood={getReinoMood()} />
        <h2 id="porta-titulo" className="reino-gate__titulo">
          {tituloPara(origem)}
        </h2>

        {temCaminho ? (
          <div className="reino-porta__caminho">
            <p className="reino-rotulo">Seu caminho até aqui</p>
            {caminho.dias > 0 && (
              <>
                <p className="reino-porta__dias">
                  {caminho.dias} {caminho.dias === 1 ? 'dia' : 'dias'} no reino
                  {caminho.marco ? ` · ${caminho.marco.nome}` : ''}
                </p>
                <PincelProgresso value={caminho.valor} className="reino-porta__pincel" />
              </>
            )}
            {feitos.length > 0 && (
              <ul className="reino-porta__feitos">
                {feitos.map((f) => (
                  <li key={f.texto}>{f.texto}</li>
                ))}
              </ul>
            )}
            <p className="reino-gate__texto">Com a assinatura, tudo isso segue e todas as portas abrem.</p>
          </div>
        ) : (
          <p className="reino-gate__texto">
            O primeiro passo de cada caminho é seu, sem pagar. Com a assinatura, todas as portas abrem: a Eco, as sete
            noites, as trilhas e os Cinco Anéis.
          </p>
        )}

        <p className="reino-gate__nota">Sete dias com tudo aberto. Nada é cobrado hoje. Depois, R$ 15,90/mês.</p>
        <div className="reino-gate__acoes">
          <button type="button" className="reino-placa" onClick={abrirPortas}>
            Abrir todas as portas <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="reino-gate__depois" onClick={() => onFechar()}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
