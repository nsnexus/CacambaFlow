import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAddressById } from '@/app/actions/customers';
import { AddressForm } from '@/components/customers/address-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Obra — CaçambaFlow' };

export default async function EditarObraPage({ params }: { params: { id: string; addressId: string } }) {
  let address;
  try {
    address = await getAddressById(params.id, params.addressId);
  } catch {
    notFound();
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href={`/clientes/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para {(address as any)?.customer_name}
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Editar Obra</h1>
        <p className="text-muted text-sm">{(address as any)?.name}</p>
      </div>

      <div className="card">
        <AddressForm customerId={params.id} address={serializeFirestoreData(address) as any} />
      </div>
    </div>
  );
}
