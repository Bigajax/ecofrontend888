import { Link } from 'react-router-dom';
import LegalLayout, { Contato } from './LegalLayout';
import { RESPONSAVEL } from './responsavel';

/**
 * Política de privacidade (LGPD). Os serviços e dados listados são os que o
 * código do app usa de fato (set/2026). Se entrar ou sair um fornecedor, esta
 * página muda junto. Revisar com um advogado antes de tratar como definitiva.
 */
const OPERADORES: [string, string][] = [
  ['Supabase', 'guarda a sua conta e os dados do app (banco de dados e login)'],
  ['Vercel e Render', 'hospedam o site e o servidor do app'],
  ['OpenRouter e OpenAI', 'geram as respostas da Eco e organizam a memória das conversas'],
  ['ElevenLabs', 'transforma as respostas da Eco em áudio, quando você pede para ouvir'],
  ['Mercado Pago', 'processa os pagamentos no cartão e no Pix'],
  ['Google', 'permite entrar com a conta Google, se você escolher esse caminho'],
  ['Mixpanel', 'mede como o app é usado (quais telas e botões), para melhorar o produto'],
  ['Meta (Facebook e Instagram)', 'mede o resultado dos anúncios, por meio do Pixel e da API de conversões'],
];

export default function PrivacidadePage() {
  return (
    <LegalLayout
      rotulo="Documentos · Política de privacidade"
      titulo="Política de privacidade"
      sobre="Que dados o Ecotopia coleta, para que usa, com quem compartilha e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (LGPD)."
    >
      <section>
        <h2>1. Quem cuida dos seus dados</h2>
        <p>
          {RESPONSAVEL.nome ? (
            <>
              O controlador dos seus dados é {RESPONSAVEL.nome}
              {RESPONSAVEL.documento && <>, {RESPONSAVEL.documento}</>}, responsável pelo Ecotopia.
            </>
          ) : (
            <>O Ecotopia é o controlador dos seus dados.</>
          )}{' '}
          Para qualquer assunto de privacidade, inclusive falar com o encarregado de dados, escreva para <Contato />.
        </p>
      </section>

      <section>
        <h2>2. Que dados coletamos</h2>
        <dl className="reino-artigo__habitos">
          <div>
            <dt>Conta</dt>
            <dd>Nome, e-mail e, se entrar com o Google, a foto do perfil.</dd>
          </div>
          <div>
            <dt>O que você conta à Eco</dt>
            <dd>
              As conversas, as memórias guardadas, o perfil e o relatório emocional gerados a partir delas, e os sonhos que
              você envia para leitura.
            </dd>
          </div>
          <div>
            <dt>Suas práticas</dt>
            <dd>
              Respostas dos 5 Anéis, reflexões lidas no Diário, progresso nas meditações e no Protocolo do Sono, favoritos.
            </dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>
              Plano, status da assinatura e histórico de cobranças. Os dados do cartão são tratados pelo Mercado Pago e não
              ficam guardados no Ecotopia.
            </dd>
          </div>
          <div>
            <dt>Uso do app</dt>
            <dd>
              Telas visitadas, botões clicados, tipo de aparelho e navegador, e identificadores guardados no seu navegador
              para reconhecer a sessão.
            </dd>
          </div>
        </dl>
        <p>
          Parte do que você conta à Eco pode revelar informações sobre a sua saúde emocional. A LGPD chama isso de dado
          sensível, e ele só é tratado para oferecer o serviço que você pediu, com o seu consentimento ao usar a Eco.
        </p>
      </section>

      <section>
        <h2>3. Como a inteligência artificial usa os seus dados</h2>
        <ul>
          <li>
            Quando você conversa com a Eco, a sua mensagem e o contexto necessário (trechos da conversa e memórias
            guardadas) são enviados a um provedor de IA para gerar a resposta. Hoje usamos a OpenRouter com modelos da
            OpenAI.
          </li>
          <li>
            Para a Eco lembrar do que vocês conversaram, trechos das conversas são transformados em representações
            numéricas (embeddings) e guardados na sua conta.
          </li>
          <li>Quando você pede para ouvir uma resposta, o texto é enviado à ElevenLabs para virar áudio.</li>
          <li>
            Se você usar o microfone, o reconhecimento de voz pode ser feito pelo próprio navegador, conforme as regras
            dele.
          </li>
          <li>Não vendemos as suas conversas e não as usamos para anúncios.</li>
        </ul>
      </section>

      <section>
        <h2>4. Para que usamos e com qual base legal</h2>
        <ul>
          <li>Para prestar o serviço que você contratou: conta, conteúdo, Eco, assinatura (execução de contrato).</li>
          <li>Para tratar o que você conta à Eco, inclusive dados sensíveis (seu consentimento).</li>
          <li>Para medir o uso e melhorar o app, e para medir anúncios (legítimo interesse).</li>
          <li>Para cumprir obrigações legais e fiscais, como guardar registros de pagamento (obrigação legal).</li>
        </ul>
      </section>

      <section>
        <h2>5. Com quem compartilhamos</h2>
        <p>Compartilhamos dados só com os fornecedores que fazem o app funcionar, cada um para a sua função:</p>
        <dl className="reino-artigo__habitos">
          {OPERADORES.map(([nome, funcao]) => (
            <div key={nome}>
              <dt>{nome}</dt>
              <dd>{funcao}.</dd>
            </div>
          ))}
        </dl>
        <p>
          Alguns desses fornecedores guardam ou processam dados em servidores fora do Brasil. Nesses casos, a
          transferência segue as regras da LGPD para transferência internacional.
        </p>
        <p>Também podemos compartilhar dados quando a lei ou uma ordem judicial exigir.</p>
      </section>

      <section id="cookies">
        <h2>6. Cookies e armazenamento no navegador</h2>
        <p>
          O app guarda informações no seu navegador (armazenamento local e cookies) para manter você conectado, lembrar
          preferências e o progresso, e para as medições do Mixpanel e da Meta. Você pode apagar esses dados nas
          configurações do navegador; algumas partes do app podem deixar de funcionar como antes.
        </p>
      </section>

      <section>
        <h2>7. Por quanto tempo guardamos</h2>
        <p>
          Guardamos os dados enquanto a sua conta existir. Quando você pede a exclusão, apagamos os dados da conta,
          exceto o que a lei manda manter (como registros de pagamento), pelo prazo que a lei exige.
        </p>
      </section>

      <section>
        <h2>8. Seus direitos</h2>
        <p>Pela LGPD, você pode pedir a qualquer momento:</p>
        <ul>
          <li>Confirmação de que tratamos os seus dados e acesso a eles.</li>
          <li>Correção de dados incompletos ou errados.</li>
          <li>Exclusão da conta e dos dados, ou de parte deles.</li>
          <li>Cópia dos seus dados (portabilidade).</li>
          <li>Informação sobre com quem compartilhamos.</li>
          <li>Revogação do consentimento, sabendo que sem ele a Eco não consegue funcionar.</li>
        </ul>
        <p>
          Para qualquer um desses pedidos, escreva para <Contato /> a partir do e-mail da sua conta. Você também pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </section>

      <section>
        <h2>9. Segurança</h2>
        <p>
          O acesso aos dados é separado por conta: cada pessoa só enxerga os próprios dados no app. Nenhum sistema é
          totalmente imune a falhas; se acontecer um incidente que possa trazer risco a você, avisamos você e a ANPD como
          a lei manda.
        </p>
      </section>

      <section>
        <h2>10. Menores de idade</h2>
        <p>
          O Ecotopia é destinado a pessoas com 18 anos ou mais. Se soubermos que uma conta é de um menor, ela será
          encerrada.
        </p>
      </section>

      <section>
        <h2>11. Mudanças nesta política</h2>
        <p>
          Quando esta política mudar de forma importante, avisamos no app ou por e-mail. Veja também os{' '}
          <Link to="/termos">termos de uso</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
