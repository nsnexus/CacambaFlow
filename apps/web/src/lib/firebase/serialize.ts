import * as admin from 'firebase-admin';

/**
 * Componentes client não aceitam instâncias de classe vindas de Server
 * Components (ex: admin.firestore.Timestamp). Isso quebra em produção com
 * "Only plain objects... can be passed to Client Components". Usar antes de
 * passar dados do Admin SDK como prop pra um componente 'use client'.
 */
export function serializeFirestoreData<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreData(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeFirestoreData(val);
    }
    return out as T;
  }

  return value;
}
