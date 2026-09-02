'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

// Em telas largas o menu fica sempre visível (comportamento de sempre). Em
// mobile ele vira uma gaveta fora da tela — esse estado de aberto/fechado
// precisa viver aqui em cima, num client component, porque Sidebar e Header
// são irmãos (o botão de abrir fica no Header, o menu em si é o Sidebar).
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="app-content">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="app-main">{children}</main>
      </div>

      <style>{`
        .app-shell {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        .app-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .app-main {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--space-6);
        }
        @media (max-width: 768px) {
          .app-main { padding: var(--space-4); }
        }
      `}</style>
    </div>
  );
}
