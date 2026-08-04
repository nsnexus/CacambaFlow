import NetInfo from '@react-native-community/netinfo';
import { outbox } from './outbox';

export class SyncOrchestrator {
  private isSyncing = false;
  private backendUrl: string;
  private tokenProvider: () => Promise<string | null>;

  constructor(backendUrl: string, tokenProvider: () => Promise<string | null>) {
    this.backendUrl = backendUrl;
    this.tokenProvider = tokenProvider;
  }

  /**
   * Tenta enviar todos os eventos pendentes para o servidor web.
   * Só procede se houver conexão com a internet.
   */
  async pushPendingEvents(): Promise<void> {
    if (this.isSyncing) return;

    try {
      this.isSyncing = true;
      
      const network = await NetInfo.fetch();
      if (!network.isConnected || !network.isInternetReachable) {
        return; // Offline, tenta depois
      }

      const events = await outbox.getPendingEvents();
      if (events.length === 0) return;

      const token = await this.tokenProvider();
      if (!token) throw new Error('Não autenticado');

      // Envia os eventos em lote (batch) para o endpoint de sync
      const response = await fetch(`${this.backendUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no servidor de sync: ${errorText}`);
      }

      // O servidor retorna quais eventos processou com sucesso
      const result = await response.json();
      const processedIds: string[] = result.processed || [];

      // Marca como processado localmente
      for (const event_id of processedIds) {
        await outbox.markAsSynced(event_id);
      }

      // Os que falharam ficam na fila com retry_count++
      const failedIds: { id: string, reason: string }[] = result.failed || [];
      for (const failed of failedIds) {
        await outbox.markAsFailed(failed.id, failed.reason);
      }

    } catch (error: any) {
      console.warn('[SyncOrchestrator] Falha no push:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Inicia um listener que observa a rede e força o sync quando a internet volta
   */
  startNetworkListener() {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.pushPendingEvents();
      }
    });
  }
}
