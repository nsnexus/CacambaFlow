'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

const STATE_NAME_TO_UF: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amapa': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceará': 'CE', 'ceara': 'CE', 'distrito federal': 'DF',
  'espírito santo': 'ES', 'espirito santo': 'ES', 'goiás': 'GO', 'goias': 'GO',
  'maranhão': 'MA', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'para': 'PA', 'paraíba': 'PB', 'paraiba': 'PB',
  'paraná': 'PR', 'parana': 'PR', 'pernambuco': 'PE', 'piauí': 'PI', 'piaui': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  'rondônia': 'RO', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'são paulo': 'SP', 'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

export type AddressSearchResult = {
  displayName: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address: Record<string, string>;
};

export function AddressSearch({ onSelect }: { onSelect: (result: AddressSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data: NominatimResult[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePick(r: NominatimResult) {
    const a = r.address || {};
    const stateRaw = (a.state || '').toLowerCase();
    onSelect({
      displayName: r.display_name,
      street: a.road || a.pedestrian || '',
      number: a.house_number || '',
      district: a.suburb || a.neighbourhood || a.village || '',
      city: a.city || a.town || a.municipality || '',
      state: STATE_NAME_TO_UF[stateRaw] || '',
      postal_code: a.postcode || '',
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    });
    setResults([]);
    setQuery(r.display_name);
  }

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="flex gap-2">
        <input
          id="address-search-input"
          type="text"
          className="input"
          placeholder="Digite o endereço pra buscar (ex: Av. Paulista, 1000, São Paulo)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
        />
        <button type="button" onClick={handleSearch} className="btn btn--secondary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? 'Buscando...' : <><Search size={16} /> Buscar</>}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{
          marginTop: 'var(--space-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 'var(--space-3)',
                background: 'var(--color-surface-2)',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none',
                color: 'var(--color-text)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-muted text-xs" style={{ marginTop: 'var(--space-2)' }}>
          Nenhum resultado encontrado. Preencha os campos manualmente abaixo.
        </p>
      )}
    </div>
  );
}
