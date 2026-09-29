import { Link } from 'react-router-dom';
import LegalLayout, { Contato } from './legal/LegalLayout';

/** Como cancelar: o mesmo layout dos documentos (termos e privacidade). */
export default function CancelarAssinaturaPage() {
  return (
    <LegalLayout
      rotulo="Conta e assinatura"
      titulo="Como cancelar a assinatura"
      sobre="O caminho depende de onde você assinou: direto no Ecotopia, na App Store ou no Google Play. Se não tiver certeza, veja em Minha assinatura, dentro do app."
    >
      <section>
        <h2>Se você assinou direto no Ecotopia</h2>
        <ol className="rl-legal__passos">
          <li>Entre na sua conta pelo navegador, no computador ou no celular.</li>
          <li>
            Vá em <strong>Configurações, Assinatura</strong> (ou abra{' '}
            <Link to="/app/configuracoes?menu=assinatura">esta página</Link>) e toque em{' '}
            <strong>Cancelar assinatura</strong>.
          </li>
          <li>Confirme. Você continua com acesso até o fim do período já pago.</li>
        </ol>
        <p>
          Não encontrou o botão? Escreva para <Contato /> que a gente resolve.
        </p>
        <p>
          <strong>Reembolso:</strong> pelo Código de Defesa do Consumidor, você pode desistir em até 7 dias depois de
          contratar. Como os primeiros 7 dias são gratuitos, basta cancelar antes da primeira cobrança para não pagar
          nada. Depois da cobrança, casos especiais são avaliados pelo e-mail. Mais detalhes nos{' '}
          <Link to="/termos">termos de uso</Link>.
        </p>
      </section>

      <section>
        <h2>Se você comprou o Protocolo do Sono no Pix</h2>
        <p>
          É um pagamento único, então não há nada a cancelar. Se quiser desistir da compra, você pode pedir o reembolso em
          até 7 dias depois do pagamento, escrevendo para <Contato />.
        </p>
      </section>

      <section>
        <h2>Se você assinou pela Apple App Store</h2>
        <ol className="rl-legal__passos">
          <li>
            Abra o app <strong>Ajustes</strong> no iPhone ou iPad e toque no seu nome.
          </li>
          <li>
            Toque em <strong>Assinaturas</strong> e escolha a do Ecotopia.
          </li>
          <li>
            Toque em <strong>Cancelar assinatura</strong>. A renovação automática para no fim do ciclo atual.
          </li>
        </ol>
        <p>Compras pela App Store seguem as regras de pagamento e reembolso da Apple.</p>
      </section>

      <section>
        <h2>Se você assinou pelo Google Play</h2>
        <ol className="rl-legal__passos">
          <li>
            Abra a <strong>Google Play Store</strong>, toque no seu perfil e em{' '}
            <strong>Pagamentos e assinaturas, Assinaturas</strong>.
          </li>
          <li>Escolha a assinatura do Ecotopia.</li>
          <li>
            Toque em <strong>Cancelar assinatura</strong> e siga as instruções.
          </li>
        </ol>
        <p>Compras pelo Google Play seguem as regras de pagamento e reembolso do Google.</p>
      </section>

      <section>
        <h2>Ainda precisa de ajuda?</h2>
        <p>
          Escreva para <Contato /> a partir do e-mail da sua conta. O time responde em até 48 horas úteis.
        </p>
      </section>
    </LegalLayout>
  );
}
