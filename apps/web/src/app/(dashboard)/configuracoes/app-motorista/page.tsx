import type { Metadata } from 'next';
import { SettingsNav } from '@/components/layout/settings-nav';
import { MobileAppForm } from '@/components/settings/mobile-app-form';
import { getMobileAppSettings } from '@/app/actions/mobile-app-settings';

export const metadata: Metadata = { title: 'App do Motorista — CaçambaFlow' };

export default async function AppMotoristaSettingsPage() {
  const settings = await getMobileAppSettings();

  return (
    <div>
      <SettingsNav />
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>App do Motorista</h1>
        <p className="text-muted text-sm">
          Defina de onde vem o download do app quando o motorista clicar em "Baixar App" na tela de Motoristas.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '560px' }}>
        <MobileAppForm settings={settings} />
      </div>
    </div>
  );
}
