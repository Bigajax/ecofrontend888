import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';

const SUPPORT_EMAIL = 'ecotopia.app777@gmail.com';

export default function CancelarAssinaturaPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="ecotopia-lp lp-help">
      <EcotopiaTopbar />

      <main className="lp-help-main">
        <div className="lp-help-inner">
          <p className="lp-help-eyebrow">Conta e assinatura</p>
          <h1 className="lp-help-title">Como faço para cancelar minha assinatura?</h1>

          <p className="lp-help-lead">
            O procedimento de cancelamento varia conforme o lugar onde você assinou
            (direto pela Ecotopia, pela Apple App Store ou pelo Google Play). Se não
            tem certeza de como contratou seu plano, acesse{' '}
            <Link to="/app/configuracoes?menu=assinatura" className="lp-help-link">
              Minha assinatura
            </Link>{' '}
            para ver os detalhes.
          </p>

          <hr className="lp-help-divider" />

          <section className="lp-help-section">
            <h2>Se você assinou direto pela Ecotopia (pelo site)</h2>
            <ol>
              <li>
                Faça login pelo navegador (computador ou celular — não pelo aplicativo)
                em <code>ecotopia.com.br</code>.
              </li>
              <li>
                Vá em <strong>Configurações → Assinatura</strong> (ou acesse direto{' '}
                <Link to="/app/configuracoes?menu=assinatura" className="lp-help-link">
                  esta página
                </Link>
                ) e clique em <strong>Cancelar Assinatura</strong>.
              </li>
              <li>
                Confirme o cancelamento. Você continua com acesso até o fim do período
                já pago — só depois disso a conta volta ao plano gratuito.
              </li>
            </ol>
            <p className="lp-help-note">
              Não está vendo o botão? Mande um e-mail para{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="lp-help-link">
                {SUPPORT_EMAIL}
              </a>{' '}
              que a gente resolve.
            </p>
            <p className="lp-help-note">
              <strong>Sobre reembolsos:</strong> assinaturas contratadas direto pela
              Ecotopia não são reembolsáveis após a cobrança, mas analisamos casos
              especiais. Se você acredita que se enquadra, escreva pra{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="lp-help-link">
                {SUPPORT_EMAIL}
              </a>{' '}
              que nosso time avalia individualmente. Mais detalhes nos{' '}
              <Link to="/termos" className="lp-help-link">
                Termos e Condições
              </Link>
              .
            </p>
          </section>

          <section className="lp-help-section">
            <h2>Se você assinou pela Apple App Store</h2>
            <ol>
              <li>Abra o app <strong>Ajustes</strong> no seu iPhone ou iPad.</li>
              <li>Toque no seu nome no topo.</li>
              <li>Toque em <strong>Assinaturas</strong>.</li>
              <li>Selecione a assinatura da <strong>Ecotopia</strong>.</li>
              <li>
                Toque em <strong>Cancelar assinatura</strong> para desativar a
                renovação automática ao fim do ciclo atual.
              </li>
            </ol>
            <p className="lp-help-note">
              Compras feitas pela App Store seguem a política de pagamento da Apple,
              que normalmente não prevê reembolsos. Veja mais nos{' '}
              <Link to="/termos" className="lp-help-link">
                Termos e Condições
              </Link>
              .
            </p>
          </section>

          <section className="lp-help-section">
            <h2>Se você assinou pelo Google Play</h2>
            <ol>
              <li>Abra a <strong>Google Play Store</strong>.</li>
              <li>
                Toque no ícone do seu perfil e depois em <strong>Pagamentos e
                assinaturas → Assinaturas</strong>.
              </li>
              <li>Toque na assinatura da <strong>Ecotopia</strong>.</li>
              <li>Toque em <strong>Cancelar assinatura</strong> e siga as instruções.</li>
            </ol>
            <p className="lp-help-note">
              Compras feitas pelo Google Play seguem a política de pagamento do
              Google, que normalmente não prevê reembolsos. Veja mais nos{' '}
              <Link to="/termos" className="lp-help-link">
                Termos e Condições
              </Link>
              .
            </p>
          </section>

          <hr className="lp-help-divider" />

          <section className="lp-help-section">
            <h2>Ainda precisa de ajuda?</h2>
            <p>
              Escreva pra{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="lp-help-link">
                {SUPPORT_EMAIL}
              </a>{' '}
              com o e-mail da sua conta Ecotopia que nosso time responde em até 48
              horas úteis.
            </p>
          </section>
        </div>
      </main>

      <EcotopiaFooter />
    </div>
  );
}
