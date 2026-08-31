import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerWithAddresses } from '@/app/actions/customers';
import { CustomerForm } from '@/components/customers/customer-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Cliente — CaçambaFlow' };

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  let customer;
  try {
    customer = await getCustomerWithAddresses(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href={`/clientes/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Editar Cliente</h1>

      <div className="card">
        <CustomerForm customer={serializeFirestoreData(customer) as any} />
      </div>
    </div>
  );
}
