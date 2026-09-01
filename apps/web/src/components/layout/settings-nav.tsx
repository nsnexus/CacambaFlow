'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/configuracoes/motivos-falha', label: 'Motivos de Falha' },
  { href: '/configuracoes/tipos-cacamba', label: 'Tipos de Caçamba' },
  { href: '/configuracoes/app-motorista', label: 'App do Motorista' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2" style={{ marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="btn btn--sm"
            style={{
              background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: isActive ? '#fff' : 'var(--color-text)',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
