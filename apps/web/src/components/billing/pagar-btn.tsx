'use client';

import { useState } from 'react';
import { markInvoiceAsPaid } from '@/app/actions/billing';

export function PagarBtn({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleBaixa() {
    if (!confirm('Confirmar o recebimento desta fatura?')) return;
    
    setLoading(true);
    try {
      await markInvoiceAsPaid(invoiceId);
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleBaixa} 
      disabled={loading} 
      className="btn btn--secondary btn--sm"
    >
      {loading ? 'Baixando...' : 'Dar Baixa'}
    </button>
  );
}
