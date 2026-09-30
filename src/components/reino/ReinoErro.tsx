import { getReinoMood } from './reinoMood';
import { ASTRO } from './astroFormas';
import './reino.css';

/**
 * Quando algo quebra (set/2026): o céu da hora, o astro e um horizonte pintado
 * com um trecho faltando, a trilha que se interrompeu. Abrir de novo não apaga
 * nada; começar do zero neste aparelho só aparece depois de repetir, e diz o
 * que apaga. Antes: cartão branco com triângulo vermelho, botão azul, emoji e
 * um "Ver detalhes técnicos" que abria um alert; e o armazenamento era limpo
 * sozinho no terceiro erro, levando o progresso guardado no aparelho.
 */
interface ReinoErroProps {
  /** página inteira (erro do app) ou só um pedaço da página */
  inline?: boolean;
  /** quantas vezes seguidas já quebrou */
  vezes?: number;
  onAbrirDeNovo: () => void;
  onVoltar: () => void;
  rotuloVoltar?: string;
  /** começar do zero neste aparelho (limpa o armazenamento local) */
  onDoZero?: () => void;
}

export default function ReinoErro({
  inline = false,
  vezes = 1,
  onAbrirDeNovo,
  onVoltar,
  rotuloVoltar = 'Voltar para Hoje',
  onDoZero,
}: ReinoErroProps) {
  const mood = getReinoMood();
  const astro = ASTRO[mood];
  const repetiu = vezes >= 2;
  const safari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className={`reino-carregando reino-erro${inline ? ' is-inline' : ''}`} data-mood={mood} role="alert">
      <svg className="reino-carregando__astro" viewBox="0 0 120 120" aria-hidden="true">
        <g className="reino-carregando__raios">
          <path d={astro.raios} />
        </g>
        <path className="reino-carregando__sol" d={astro.corpo} />
        {astro.brilho && <path className="reino-carregando__brilho" d={astro.brilho} />}
      </svg>
      <svg className="reino-erro__horizonte" viewBox="0 0 240 14" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 8.2C28 5 58 9.6 92 7.4" />
        <path d="M146 6.6c30-2.6 60-1.2 90 1.8" />
        <path d="M104 9.4l6 1.8M128 4.6l6 1.6" className="reino-erro__lascas" />
      </svg>

      <h1 className="reino-erro__titulo">
        {repetiu ? 'A trilha se interrompeu de novo.' : 'A trilha se interrompeu aqui.'}
      </h1>
      <p className="reino-erro__texto">
        {repetiu
          ? 'Abrir de novo ainda pode resolver. Se continuar, dá para começar do zero neste aparelho.'
          : safari
            ? 'No Safari isso acontece depois de um tempo parado. Abrir de novo resolve, e nada do que você fez se perde.'
            : 'Alguma coisa não carregou direito. Abrir de novo costuma resolver, e nada do que você fez se perde.'}
      </p>

      <div className="reino-erro__acoes">
        <button type="button" className="reino-erro__placa" onClick={onAbrirDeNovo}>
          Abrir de novo
        </button>
        <button type="button" className="reino-erro__link" onClick={onVoltar}>
          {rotuloVoltar}
        </button>
      </div>

      {repetiu && onDoZero && (
        <p className="reino-erro__zero">
          <button type="button" className="reino-erro__link" onClick={onDoZero}>
            Começar do zero neste aparelho
          </button>
          <span>Apaga o que ficou salvo só aqui, como os dias do caminho e as meditações guardadas. A sua conta continua.</span>
        </p>
      )}

      <p className="reino-carregando__codigo">{`vez ${vezes} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}</p>
    </div>
  );
}
