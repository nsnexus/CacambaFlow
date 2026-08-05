import { redirect } from 'next/navigation';

export default function ConfiguracoesPage() {
  // Redireciona temporariamente para motivos-falha
  // No futuro, isso pode ser um painel com várias opções de configuração
  redirect('/configuracoes/motivos-falha');
}
