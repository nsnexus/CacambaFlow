import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/server';
import { DashboardShell } from '@/components/layout/dashboard-shell';

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

  return <DashboardShell>{children}</DashboardShell>;
}
