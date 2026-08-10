import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Política de Privacidade — CaçambaFlow',
  description: 'Como o CaçambaFlow coleta, usa e protege os dados de clientes, motoristas e usuários do sistema e do aplicativo.',
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link href="/" className="landing-brand">
            <Image src="/logo-mark.png" alt="" width={36} height={36} priority />
            <span>CaçambaFlow</span>
          </Link>
        </div>
      </header>

      <section className="section">
        <div className="landing-container legal">
          <h1>Política de Privacidade</h1>
          <p className="legal__updated">Última atualização: 10 de agosto de 2026</p>

          <p>
            Esta Política de Privacidade descreve como o <strong>CaçambaFlow</strong> coleta, usa, armazena e
            protege os dados de usuários do sistema web e do aplicativo móvel (motoristas), utilizados para gestão
            operacional de locadoras de caçambas.
          </p>

          <h2>1. Dados que coletamos</h2>
          <ul>
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e empresa vinculada, informados por clientes e usuários do sistema.</li>
            <li><strong>Localização (GPS):</strong> o app do motorista coleta localização em primeiro e segundo plano durante a jornada de trabalho, para rastrear atendimentos e otimizar rotas.</li>
            <li><strong>Fotos:</strong> o app usa a câmera do dispositivo para registrar evidências de entrega, troca e coleta de caçambas.</li>
            <li><strong>Dados de uso:</strong> registros de pedidos, atendimentos e interações dentro do sistema.</li>
          </ul>

          <h2>2. Como usamos os dados</h2>
          <ul>
            <li>Gerenciar pedidos, despacho e execução de atendimentos em campo.</li>
            <li>Rastrear a frota em tempo real e otimizar rotas dos motoristas.</li>
            <li>Registrar evidências (foto e localização) de cada etapa do atendimento.</li>
            <li>Gerar relatórios operacionais e financeiros para a locadora contratante.</li>
            <li>Enviar notificações relacionadas a pedidos e solicitações de orçamento.</li>
          </ul>

          <h2>3. Compartilhamento de dados</h2>
          <p>
            Não vendemos dados pessoais a terceiros. Dados são compartilhados apenas com a empresa (locadora)
            responsável pela operação do usuário e com provedores de infraestrutura necessários ao funcionamento do
            sistema (hospedagem, banco de dados, envio de e-mail e mapas).
          </p>

          <h2>4. Localização em segundo plano</h2>
          <p>
            O app do motorista usa localização em segundo plano exclusivamente durante a jornada de trabalho ativa,
            para permitir o rastreamento da frota e o registro de chegada/conclusão dos atendimentos. Essa coleta
            pode ser desativada nas configurações do dispositivo, o que pode limitar funcionalidades do app.
          </p>

          <h2>5. Armazenamento e segurança</h2>
          <p>
            Os dados são armazenados em infraestrutura em nuvem com controles de acesso restritos à equipe
            responsável pela operação de cada empresa cliente. Adotamos medidas técnicas razoáveis para proteger os
            dados contra acesso não autorizado.
          </p>

          <h2>6. Retenção e exclusão</h2>
          <p>
            Os dados são mantidos enquanto a conta estiver ativa ou conforme necessário para cumprir obrigações
            legais e contratuais. Usuários podem solicitar a exclusão de seus dados pelo contato abaixo.
          </p>

          <h2>7. Direitos do titular (LGPD)</h2>
          <p>
            Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais a qualquer
            momento, conforme a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h2>8. Contato</h2>
          <p>
            Dúvidas sobre esta política ou solicitações relacionadas aos seus dados: {' '}
            <a href="mailto:suporte@nsnexus.com.br">suporte@nsnexus.com.br</a> ou pelo{' '}
            <a href="https://wa.me/5594991081351" target="_blank" rel="noopener noreferrer">WhatsApp</a>.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-brand">
            <Image src="/logo-mark.png" alt="" width={24} height={24} />
            <span>CaçambaFlow</span>
          </div>
          <p className="text-muted text-sm">© {new Date().getFullYear()} CaçambaFlow. Todos os direitos reservados.</p>
        </div>
      </footer>

      <style>{`
        .landing-container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 var(--space-6);
        }
        .landing-brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          font-size: 1.0625rem;
        }
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .landing-header__inner {
          display: flex;
          align-items: center;
          height: 72px;
        }
        .section { padding: var(--space-12) 0; }
        .legal { max-width: 760px; }
        .legal h1 { font-size: 2rem; font-weight: 800; margin-bottom: var(--space-2); letter-spacing: -0.01em; }
        .legal__updated { color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--space-8); }
        .legal p { color: var(--color-text-muted); line-height: 1.7; margin-bottom: var(--space-4); }
        .legal ul { margin: 0 0 var(--space-5); padding-left: 1.25rem; color: var(--color-text-muted); line-height: 1.7; }
        .legal li { margin-bottom: var(--space-2); }
        .legal h2 { font-size: 1.25rem; font-weight: 700; margin: var(--space-8) 0 var(--space-3); color: var(--color-text); }
        .legal a { color: var(--color-primary); }
        .landing-footer { border-top: 1px solid var(--color-border-subtle); padding: var(--space-8) 0; }
        .landing-footer__inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); }
      `}</style>
    </main>
  );
}
