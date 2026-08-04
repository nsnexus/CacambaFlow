// Badge de status reutilizável em todo o sistema

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  // Atendimentos
  RASCUNHO:        { label: 'Rascunho',     cls: 'badge--cancelado' },
  PENDENTE:        { label: 'Pendente',     cls: 'badge--pendente' },
  ATRIBUIDO:       { label: 'Atribuído',    cls: 'badge--atribuido' },
  EM_ROTA:         { label: 'Em Rota',      cls: 'badge--em-rota' },
  NO_LOCAL:        { label: 'No Local',     cls: 'badge--no-local' },
  EM_EXECUCAO:     { label: 'Em Execução',  cls: 'badge--em-execucao' },
  CONCLUIDO_LOCAL: { label: 'Salvo Local',  cls: 'badge--em-execucao' },
  SINCRONIZANDO:   { label: 'Sincronizando',cls: 'badge--atribuido' },
  CONCLUIDO:       { label: 'Concluído',    cls: 'badge--concluido' },
  FALHADO:         { label: 'Falhado',      cls: 'badge--falhado' },
  REAGENDADO:      { label: 'Reagendado',   cls: 'badge--pendente' },
  CANCELADO:       { label: 'Cancelado',    cls: 'badge--cancelado' },
  REABERTO:        { label: 'Reaberto',     cls: 'badge--pendente' },
  ERRO_SYNC:       { label: 'Erro Sync',    cls: 'badge--falhado' },

  // Cadastros
  ATIVO:           { label: 'Ativo',        cls: 'badge--concluido' },
  INATIVO:         { label: 'Inativo',      cls: 'badge--cancelado' },
  MANUTENCAO:      { label: 'Manutenção',   cls: 'badge--em-execucao' },
  SUSPENSO:        { label: 'Suspenso',     cls: 'badge--falhado' },

  // Caçambas
  DISPONIVEL:      { label: 'Disponível',   cls: 'badge--concluido' },
  RESERVADA:       { label: 'Reservada',    cls: 'badge--atribuido' },
  EM_TRANSPORTE:   { label: 'Em Transporte',cls: 'badge--em-rota' },
  LOCADA:          { label: 'Locada',       cls: 'badge--no-local' },
  COLETA_PROGRAMADA: { label: 'Coleta Prog.',cls: 'badge--pendente' },
  EM_DESCARGA:     { label: 'Em Descarga',  cls: 'badge--em-execucao' },
  EM_LIMPEZA:      { label: 'Em Limpeza',   cls: 'badge--em-execucao' },
  PERDIDA:         { label: 'Perdida',      cls: 'badge--falhado' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, cls: 'badge--pendente' };
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}
