import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = cookies().get('session')?.value;
  
  if (!sessionCookie) {
    redirect('/login');
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
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
