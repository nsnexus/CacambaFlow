import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDriverById } from '@/app/actions/drivers';
import { DriverForm } from '@/components/drivers/driver-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Motorista — CaçambaFlow' };

export default async function EditarMotoristaPage({ params }: { params: { id: string } }) {
  let driver;
  try {
    driver = await getDriverById(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href={`/motoristas/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Editar Motorista</h1>

      <div className="card">
        <DriverForm driver={serializeFirestoreData(driver) as any} />
      </div>
    </div>
  );
}
