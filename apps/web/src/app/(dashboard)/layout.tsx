import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Header />
        <main className="app-main">
          {children}
        </main>
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
        }
        .app-main {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-6);
        }
      `}</style>
    </div>
  );
}
