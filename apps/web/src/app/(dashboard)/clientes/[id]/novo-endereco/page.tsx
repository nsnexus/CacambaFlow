import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerWithAddresses } from '@/app/actions/customers';
import { AddressForm } from '@/components/customers/address-form';

export const metadata: Metadata = { title: 'Nova Obra — CaçambaFlow' };

export default async function NovaObraPage({ params }: { params: { id: string } }) {
  let customer;
  try {
    customer = await getCustomerWithAddresses(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href={`/clientes/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para {customer?.name}
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nova Obra</h1>
        <p className="text-muted text-sm">Cadastre um endereço de obra para {customer?.name}.</p>
      </div>

      <div className="card">
        <AddressForm customerId={params.id} />
      </div>
    </div>
  );
}
