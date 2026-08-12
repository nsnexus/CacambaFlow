import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Calculadora Simples',
  description: 'Política de privacidade do app Calculadora Simples.',
};

export default function CalculadoraPrivacidadePage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>
        Política de Privacidade — Calculadora Simples
      </h1>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 32 }}>
        Última atualização: 12 de agosto de 2026
      </p>

      <p>
        O app <strong>Calculadora Simples</strong> não coleta, armazena, processa ou compartilha
        nenhum dado pessoal do usuário. Todas as operações de cálculo são realizadas localmente
        no próprio dispositivo, sem conexão com servidores externos.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '32px 0 12px' }}>
        Permissões
      </h2>
      <p>O app não solicita nenhuma permissão especial do dispositivo.</p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '32px 0 12px' }}>
        Contato
      </h2>
      <p>
        Dúvidas sobre esta política: <a href="mailto:suporte@nsnexus.com.br">suporte@nsnexus.com.br</a>
      </p>
    </main>
  );
}
