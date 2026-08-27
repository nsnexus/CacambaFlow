'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-executa o Server Component da página (router.refresh()) num intervalo
 * fixo, sem recarregar a página inteira nem perder estado de UI local.
 * Usado nas telas "ao vivo" (ex.: Centro de Controle) que antes só buscavam
 * dados uma vez no carregamento, apesar do rótulo dizer "tempo real".
 */
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
