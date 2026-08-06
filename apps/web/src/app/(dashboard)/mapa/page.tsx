import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Centro de Controle — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

// TODO: Migrar para Firestore Realtime
async function getLatestLocations() {
  const { tenantId } = await requireUserAndTenant();
  try {
    const locationsSnap = await adminDb.collection('fleet_locations')
      .where('tenant_id', '==', tenantId)
      .limit(100)
      .get();
    
    const data = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, any>));
    return data.sort((a, b) => {
      const timeA = a.timestamp?._seconds || 0;
      const timeB = b.timestamp?._seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export default async function MapaPage() {
  const telemetry = await getLatestLocations();

  return (
    <div style={{ height: 'calc(100vh - var(--header-height) - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Centro de Controle (Real-time)</h1>
          <p className="text-muted text-sm">Acompanhamento da frota em campo via telemetria de aplicativo</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <span className="badge badge--concluido">● Atualizando ao vivo</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar tática (Lista de Motoristas) */}
        <div style={{ width: '320px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Unidades Rastreadas ({telemetry.length})</h2>
          </div>
          
          <div style={{ padding: 'var(--space-2)' }}>
            {telemetry.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                Nenhum sinal GPS recebido hoje.
              </p>
            ) : (
              telemetry.map((t, idx) => {
                const diffMin = Math.floor((new Date().getTime() - new Date(t.location.device_timestamp).getTime()) / 60000);
                const isOnline = diffMin < 10; // Menos de 10 minutos = online

                return (
                  <div key={idx} style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', borderLeft: `3px solid ${isOnline ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.driver.profiles.name}</span>
                      <span style={{ fontSize: '0.75rem', color: isOnline ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {isOnline ? 'Online' : `Há ${diffMin} min`}
                      </span>
                    </div>
                    <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>
                      {t.location.latitude.toFixed(5)}, {t.location.longitude.toFixed(5)}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      Velocidade: {t.location.speed ? `${(t.location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Área do Mapa Principal */}
        <div style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          {/* Placeholder visual Premium para o Mapa (Substituído no futuro por Google Maps / Leaflet) */}
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🗺️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>Integração de Mapa Pendente</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
              A telemetria já está sendo gravada no banco de dados. Para visualização gráfica, configure a chave de API do provedor de mapas (Google Maps / Mapbox) no arquivo `.env`.
            </p>
          </div>

          {/* Marcadores Simulados em cima do placeholder para efeito estético */}
          {telemetry.map((t, idx) => (
            <div key={idx} style={{
              position: 'absolute',
              top: `${Math.floor(Math.random() * 60 + 20)}%`, // Random dummy position
              left: `${Math.floor(Math.random() * 60 + 20)}%`, // Random dummy position
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ background: 'var(--color-surface)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--color-border)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                {t.driver.profiles.name}
              </div>
              <div style={{ width: 16, height: 16, background: 'var(--color-primary)', borderRadius: 8, border: '2px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
            </div>
          ))}
          
        </div>
      </div>
    </div>
  );
}
