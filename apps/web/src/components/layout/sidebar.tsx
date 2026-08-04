'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/atendimentos', label: 'Atendimentos', icon: '📋' },
  { href: '/pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/motoristas', label: 'Motoristas', icon: '🚛' },
  { href: '/veiculos', label: 'Veículos', icon: '🚚' },
  { href: '/cacambas', label: 'Caçambas', icon: '🪣' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/mapa', label: 'Centro de Controle', icon: '🗺️' },
  { href: '/evidencias', label: 'Evidências', icon: '📷' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">🪣</span>
        <span className="sidebar__brand-name">CaçambaFlow</span>
      </div>

      <nav className="sidebar__nav" aria-label="Menu principal">
        <ul role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  id={`nav-${item.href.replace(/\//g, '').replace(/-/g, '_')}`}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="sidebar__link-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .sidebar__brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-5) var(--space-4);
          font-size: 1rem;
          font-weight: 700;
          border-bottom: 1px solid var(--color-border);
          height: var(--header-height);
        }
        .sidebar__brand-icon { font-size: 1.25rem; }
        .sidebar__nav { padding: var(--space-3) 0; flex: 1; }
        .sidebar__nav ul { list-style: none; }
        .sidebar__link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-4);
          margin: 1px var(--space-2);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--color-text-muted);
          transition: all var(--transition-fast);
          text-decoration: none;
        }
        .sidebar__link:hover {
          background: var(--color-surface-2);
          color: var(--color-text);
        }
        .sidebar__link--active {
          background: color-mix(in srgb, var(--color-primary) 12%, transparent);
          color: var(--color-primary);
          font-weight: 600;
        }
        .sidebar__link-icon { font-size: 1rem; width: 20px; text-align: center; }
      `}</style>
    </aside>
  );
}
