'use client';

import { createClientClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClientClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="header">
      <div className="header__left">
        {/* Breadcrumb ou título da página pode ser injetado aqui */}
      </div>
      <div className="header__right">
        <button
          id="header-logout-btn"
          className="btn btn--secondary btn--sm"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          Sair
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
        }
      `}</style>
    </header>
  );
}
