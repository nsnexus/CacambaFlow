'use client';

import { useState } from 'react';
import { createInvoice } from '@/app/actions/billing';

export function FaturarBtn({ 
  orderId, 
  customerId, 
  amount 
}: { 
  orderId: string, 
  customerId: string, 
  amount: number 
}) {
  const [loading, setLoading] = useState(false);

  async function handleFaturar() {
    // Para o MVP: Fatura vence em 7 dias automaticamente
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    setLoading(true);
    try {
      await createInvoice(orderId, customerId, amount, dueDate.toISOString().split('T')[0]);
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleFaturar} 
      disabled={loading} 
      className="btn btn--primary btn--sm"
    >
      {loading ? 'Faturando...' : 'Gerar Fatura'}
    </button>
  );
}
