'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  UserRound,
  Truck,
  Container,
  Users,
  Radar,
  Camera,
  BarChart3,
  Building2,
  Inbox,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/atendimentos', label: 'Atendimentos', icon: ClipboardList },
  { href: '/pedidos', label: 'Pedidos', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/motoristas', label: 'Motoristas', icon: UserRound },
  { href: '/veiculos', label: 'Veículos', icon: Truck },
  { href: '/cacambas', label: 'Caçambas', icon: Container },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/mapa', label: 'Centro de Controle', icon: Radar },
  { href: '/evidencias', label: 'Evidências', icon: Camera },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/solicitacoes', label: 'Solicitações', icon: Inbox },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Fundo escurecido atrás da gaveta — só existe/aparece em mobile (ver CSS) */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'sidebar-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <Image src="/logo-mark.png" alt="" width={22} height={22} className="sidebar__brand-icon" />
          <span className="sidebar__brand-name">CaçambaFlow</span>
        </div>

        <nav className="sidebar__nav" aria-label="Menu principal">
          <ul role="list">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    id={`nav-${item.href.replace(/\//g, '').replace(/-/g, '_')}`}
                    className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <Icon className="sidebar__link-icon" size={18} aria-hidden="true" />
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
        .sidebar__brand-icon { border-radius: var(--radius-sm); }
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
        .sidebar__link-icon { flex-shrink: 0; }

        .sidebar-backdrop { display: none; }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            height: 100vh;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform var(--transition-base);
            box-shadow: var(--shadow-lg);
          }
          .sidebar--open { transform: translateX(0); }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 150;
            opacity: 0;
            pointer-events: none;
            transition: opacity var(--transition-base);
          }
          .sidebar-backdrop--visible {
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
      </aside>
    </>
  );
}
