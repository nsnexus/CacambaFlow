import 'server-only';
import { Resend } from 'resend';

const NOTIFICATION_TO = process.env.LEAD_NOTIFICATION_EMAIL || 'narcisofelizardo@gmail.com';

// Sem domínio próprio verificado no Resend ainda: usamos o remetente padrão
// deles (onboarding@resend.dev), que funciona sem nenhuma configuração de DNS.
const FROM = 'CaçambaFlow <onboarding@resend.dev>';

type LeadEmailData = {
  company_name: string;
  cnpj: string;
  responsible_name: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  state: string;
  office_users_count: number;
  driver_users_count: number;
  needs_tracking: 'SIM' | 'NAO';
};

export async function sendLeadNotification(lead: LeadEmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY não configurada — notificação de lead não enviada.');
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: FROM,
    to: NOTIFICATION_TO,
    subject: `Nova solicitação de orçamento — ${lead.company_name}`,
    html: `
      <h2>Nova solicitação de orçamento</h2>
      <p><strong>Empresa:</strong> ${lead.company_name}</p>
      <p><strong>CNPJ:</strong> ${lead.cnpj}</p>
      <p><strong>Responsável:</strong> ${lead.responsible_name}</p>
      <p><strong>Telefone:</strong> ${lead.contact_phone}</p>
      <p><strong>E-mail:</strong> ${lead.contact_email}</p>
      <p><strong>Cidade/UF:</strong> ${lead.city}/${lead.state}</p>
      <p><strong>Usuários no escritório:</strong> ${lead.office_users_count}</p>
      <p><strong>Motoristas no app:</strong> ${lead.driver_users_count}</p>
      <p><strong>Precisa de rastreamento:</strong> ${lead.needs_tracking === 'SIM' ? 'Sim' : 'Não'}</p>
    `,
  });
}

// E-mail de primeiro acesso pro motorista, com o link pra ele definir a
// própria senha. Melhor esforço — o remetente de teste do Resend
// (onboarding@resend.dev) só garante entrega pro e-mail dono da conta, então
// quem chama isso também deve mostrar o link na tela como caminho garantido.
export async function sendDriverAccessEmail(to: string, driverName: string, resetLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY não configurada — e-mail de acesso não enviado.');
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Seu acesso ao CaçambaFlow',
    html: `
      <p>Olá, ${driverName}!</p>
      <p>Sua conta no app CaçambaFlow foi criada. Clique no link abaixo pra definir sua senha e começar a usar:</p>
      <p><a href="${resetLink}">Definir minha senha</a></p>
      <p>Se você não esperava esse e-mail, pode ignorá-lo.</p>
    `,
  });
}
