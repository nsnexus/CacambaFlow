import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVehicleById } from '@/app/actions/vehicles';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Veículo — CaçambaFlow' };

export default async function EditarVeiculoPage({ params }: { params: { id: string } }) {
  let vehicle;
  try {
    vehicle = await getVehicleById(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href={`/veiculos/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Editar Veículo</h1>

      <div className="card">
        <VehicleForm vehicle={serializeFirestoreData(vehicle) as any} />
      </div>
    </div>
  );
}
