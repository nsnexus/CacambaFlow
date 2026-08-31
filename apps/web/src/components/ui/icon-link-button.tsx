import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * Botão redondo com ícone (sem texto) pra ações de linha nas listagens —
 * "Ver"/"Detalhes"/"Editar" viravam texto repetido em toda tabela; o ícone +
 * title (tooltip nativo) fica mais limpo com o mesmo significado.
 */
export function IconLinkButton({
  href,
  icon: Icon,
  label,
  variant = 'secondary',
  id,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  variant?: 'secondary' | 'primary';
  id?: string;
}) {
  return (
    <Link
      href={href}
      id={id}
      title={label}
      aria-label={label}
      className={`icon-btn icon-btn--${variant}`}
    >
      <Icon size={16} />
    </Link>
  );
}
