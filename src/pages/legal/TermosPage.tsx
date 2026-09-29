import { Link } from 'react-router-dom';
import LegalLayout, { Contato } from './LegalLayout';
import { RESPONSAVEL } from './responsavel';
import { OFFER, SONO_PIX_PRICE_LABEL } from '@/constants/offerCopy';

/**
 * Termos de uso. Escritos a partir do que o app faz de verdade (assinatura com
 * 7 dias gratuitos, Pix único do Protocolo do Sono, a Eco como IA). Revisar com
 * um advogado antes de tratar como definitivo.
 */
export default function TermosPage() {
  return (
    <LegalLayout
      rotulo="Documentos · Termos de uso"
      titulo="Termos de uso"
      sobre="As regras para usar o Ecotopia, a assinatura e a Eco. Escritas para serem lidas, sem letra miúda."
    >
      <section>
        <h2>1. Quem somos e o que é o Ecotopia</h2>
        <p>
          O Ecotopia é um app de bem-estar e autoconhecimento: conversa com a Eco, meditações guiadas, Protocolo do Sono,
          Diário Estoico, 5 Anéis da Disciplina e leitura de sonhos.
          {RESPONSAVEL.nome && (
            <>
              {' '}
              O serviço é oferecido por {RESPONSAVEL.nome}
              {RESPONSAVEL.documento && <>, {RESPONSAVEL.documento}</>}.
            </>
          )}
        </p>
        <p>Ao criar uma conta ou usar o app, você concorda com estes termos e com a <Link to="/privacidade">política de privacidade</Link>.</p>
      </section>

      <section>
        <h2>2. O Ecotopia não é um serviço de saúde</h2>
        <p>
          O conteúdo do app é de apoio ao bem-estar. Não é diagnóstico, tratamento, terapia nem atendimento médico ou
          psicológico, e não substitui um profissional.
        </p>
        <p>
          Em sofrimento intenso ou risco à vida, procure ajuda imediata: CVV no 188 (gratuito, 24 horas) ou SAMU no 192.
        </p>
      </section>

      <section>
        <h2>3. A Eco e a inteligência artificial</h2>
        <p>
          A Eco é uma inteligência artificial. As respostas são geradas automaticamente por modelos de linguagem de
          terceiros e podem conter erros, imprecisões ou sugestões que não servem para o seu caso. Use com senso crítico.
        </p>
        <ul>
          <li>A Eco não é uma pessoa e não é monitorada em tempo real por um profissional.</li>
          <li>Não tome decisões médicas, jurídicas ou financeiras com base apenas nas respostas dela.</li>
          <li>
            A leitura de sonhos é uma reflexão inspirada em ideias de Freud e Jung, não uma interpretação científica ou
            clínica.
          </li>
          <li>
            Para funcionar, o que você escreve ou fala para a Eco é enviado a provedores de IA. Os detalhes estão na{' '}
            <Link to="/privacidade">política de privacidade</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Sua conta</h2>
        <p>
          Você pode entrar com e-mail e senha ou com a sua conta Google. Você é responsável pelo que acontece na sua
          conta e por manter a senha segura. Os dados informados precisam ser verdadeiros.
        </p>
        <p>O Ecotopia é destinado a pessoas com 18 anos ou mais.</p>
      </section>

      <section>
        <h2>5. Assinatura</h2>
        <ul>
          <li>
            Planos: mensal ({OFFER.priceMonthly}) ou anual (R$ 142,80 por ano). Os dois dão acesso ao mesmo conteúdo.
          </li>
          <li>
            Os primeiros 7 dias são gratuitos. O cartão é pedido no cadastro e a primeira cobrança acontece depois dos 7
            dias, se você não cancelar antes.
          </li>
          <li>A assinatura renova automaticamente ao fim de cada período (mês ou ano) até ser cancelada.</li>
          <li>
            Você pode cancelar quando quiser, no app (Configurações, Assinatura) ou pelo e-mail <Contato />. O passo a
            passo está na <Link to="/cancelar-assinatura">página de cancelamento</Link>. O acesso continua até o fim do
            período já pago.
          </li>
          <li>Os pagamentos são processados pelo Mercado Pago. Os dados do cartão não ficam guardados no Ecotopia.</li>
        </ul>
      </section>

      <section>
        <h2>6. Protocolo do Sono no Pix</h2>
        <p>
          O Protocolo do Sono também pode ser comprado à parte, por {SONO_PIX_PRICE_LABEL} no Pix, em pagamento único,
          sem assinatura e sem renovação. A Noite 1 é gratuita; o pagamento libera as 7 noites na sua conta.
        </p>
      </section>

      <section>
        <h2>7. Direito de arrependimento e reembolso</h2>
        <p>
          Em compras feitas pela internet, você pode desistir em até 7 dias a partir do pagamento, conforme o artigo 49 do
          Código de Defesa do Consumidor, e receber o valor de volta. Para pedir, escreva para <Contato />.
        </p>
      </section>

      <section>
        <h2>8. O que não é permitido</h2>
        <ul>
          <li>Usar o app para atividades ilegais ou para prejudicar outras pessoas.</li>
          <li>Tentar acessar contas, dados ou partes do sistema que não são suas.</li>
          <li>Copiar, revender ou redistribuir o conteúdo do app (áudios, textos, imagens) sem autorização.</li>
          <li>Usar robôs ou meios automáticos para extrair conteúdo ou sobrecarregar o serviço.</li>
        </ul>
        <p>Se estas regras forem descumpridas, a conta pode ser suspensa ou encerrada.</p>
      </section>

      <section>
        <h2>9. Conteúdo</h2>
        <p>
          Os textos, áudios, imagens e a marca do Ecotopia são protegidos por direitos autorais e não podem ser usados
          fora do app sem autorização. O que você escreve no app continua sendo seu.
        </p>
      </section>

      <section>
        <h2>10. Disponibilidade e responsabilidade</h2>
        <p>
          Trabalhamos para o app funcionar sempre, mas podem acontecer falhas, pausas para manutenção e mudanças no
          conteúdo. O Ecotopia não se responsabiliza por decisões tomadas com base no conteúdo do app ou nas respostas da
          Eco, nos limites permitidos pela lei.
        </p>
      </section>

      <section>
        <h2>11. Mudanças nestes termos</h2>
        <p>
          Podemos atualizar estes termos. Quando a mudança for importante, avisamos no app ou por e-mail antes de ela
          valer. A data da última atualização fica no topo desta página.
        </p>
      </section>

      <section>
        <h2>12. Lei aplicável e contato</h2>
        <p>
          Estes termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor. Dúvidas, pedidos e
          reclamações: <Contato />.
        </p>
      </section>
    </LegalLayout>
  );
}
