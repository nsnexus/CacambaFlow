import { v4 as uuidv4 } from 'uuid';
import { localDb } from './db';
import type { SyncOutboxEvent, SyncEventType } from '@cacambaflow/types';

export class OutboxManager {
  /**
   * Adiciona um novo evento na fila local. Este método é chamado
   * quando o motorista aperta um botão (ex: "Iniciar Rota", "Cheguei"),
   * independentemente de estar online ou offline.
   */
  async enqueueEvent(
    tenant_id: string,
    device_id: string,
    aggregate_type: 'job' | 'session' | 'location',
    aggregate_id: string,
    event_type: SyncEventType,
    payload: Record<string, unknown>
  ): Promise<string> {
    const db = await localDb.getDb();
    const event_id = uuidv4();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO outbox_events 
       (id, tenant_id, device_id, aggregate_type, aggregate_id, event_type, occurred_at_device, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_id,
        tenant_id,
        device_id,
        aggregate_type,
        aggregate_id,
        event_type,
        now,
        JSON.stringify(payload),
        now,
      ]
    );

    return event_id;
  }

  /**
   * Recupera todos os eventos pendentes para envio.
   */
  async getPendingEvents(): Promise<SyncOutboxEvent[]> {
    const db = await localDb.getDb();
    
    // Pega todos ordenados por data de criação (FIFO)
    const rows = await db.getAllAsync(
      `SELECT * FROM outbox_events ORDER BY created_at ASC`
    ) as any[];

    return rows.map(row => ({
      event_id: row.id,
      tenant_id: row.tenant_id,
      device_id: row.device_id,
      aggregate_type: row.aggregate_type,
      aggregate_id: row.aggregate_id,
      event_type: row.event_type as SyncEventType,
      occurred_at_device: row.occurred_at_device,
      payload: JSON.parse(row.payload),
      retry_count: row.retry_count,
      last_error: row.last_error,
      created_at: row.created_at,
    }));
  }

  /**
   * Remove o evento da fila local após sucesso de sincronização.
   */
  async markAsSynced(event_id: string): Promise<void> {
    const db = await localDb.getDb();
    await db.runAsync(`DELETE FROM outbox_events WHERE id = ?`, [event_id]);
  }

  /**
   * Atualiza o contador de retentativas se o sync falhar.
   */
  async markAsFailed(event_id: string, errorMsg: string): Promise<void> {
    const db = await localDb.getDb();
    await db.runAsync(
      `UPDATE outbox_events 
       SET retry_count = retry_count + 1, last_error = ? 
       WHERE id = ?`,
      [errorMsg, event_id]
    );
  }
}

export const outbox = new OutboxManager();
