import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/firebase/server';

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}
