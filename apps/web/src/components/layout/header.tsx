'use client';

import { auth } from '@/lib/firebase/client';
import { clearSessionCookie } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircle, Menu, LogOut } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    await auth.signOut();
    await clearSessionCookie();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="header">
      <div className="header__left">
        <button
          id="header-menu-btn"
          className="header__menu-btn"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        {/* Breadcrumb ou título da página pode ser injetado aqui */}
      </div>
      <div className="header__right flex items-center gap-2">
        <Link
          id="header-minha-conta"
          href="/minha-conta"
          className="btn btn--secondary btn--sm"
          aria-label="Minha conta"
          title="Minha conta"
        >
          <UserCircle size={16} /> <span className="header__btn-label">Minha Conta</span>
        </Link>
        <ThemeToggle />
        <button
          id="header-logout-btn"
          className="btn btn--secondary btn--sm"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut size={16} /> <span className="header__btn-label">Sair</span>
        </button>
      </div>

      <style>{`
        .header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-6);
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          gap: var(--space-2);
        }
        .header__left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          min-width: 0;
        }
        .header__menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          padding: var(--space-1);
        }

        @media (max-width: 768px) {
          .header { padding: 0 var(--space-3); }
          .header__menu-btn { display: flex; }
          .header__btn-label { display: none; }
        }
      `}</style>
    </header>
  );
}
