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

async function searchNominatim(q: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  return res.json();
}

export function AddressSearch({ onSelect }: { onSelect: (result: AddressSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [cep, setCep] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [approximate, setApproximate] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // O Nominatim (OpenStreetMap) tem cobertura de rua bem fraca em cidade
  // pequena/média no Brasil — a busca "crua" que o usuário digitou às vezes
  // não acha nada. Em vez de simplesmente falhar, afrouxa a busca aos poucos
  // (tira o último pedaço separado por vírgula) até achar pelo menos algo
  // aproximado — melhor um resultado no nível do bairro/cidade pra ajustar o
  // pino manualmente do que nada.
  async function searchWithFallback(q: string) {
    let attempt = q;
    let data = await searchNominatim(attempt);
    let loosened = false;
    while (data.length === 0 && attempt.includes(',')) {
      attempt = attempt.slice(0, attempt.lastIndexOf(',')).trim();
      if (!attempt) break;
      data = await searchNominatim(attempt);
      loosened = true;
    }
    setApproximate(loosened && data.length > 0);
    return data;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      setResults(await searchWithFallback(query));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // CEP é dado oficial dos Correios (ViaCEP) — nome de rua/bairro/cidade sai
  // certo mesmo em cidade pequena onde o OpenStreetMap não tem nada mapeado.
  // Usa isso pra montar uma busca melhor em vez de depender só do que o
  // usuário digitou de cabeça.
  async function handleCepLookup(e: React.FormEvent) {
    e.preventDefault();
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }
    setCepError('');
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        return;
      }
      const composed = [data.logradouro, data.bairro, data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : data.localidade]
        .filter(Boolean)
        .join(', ');
      setQuery(composed);
      setLoading(true);
      setSearched(true);
      try {
        setResults(await searchWithFallback(composed));
      } finally {
        setLoading(false);
      }
    } catch {
      setCepError('Não foi possível consultar o CEP agora');
    } finally {
      setCepLoading(false);
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
    setApproximate(false);
    setQuery(r.display_name);
  }

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-2)' }}>
        <input
          id="address-cep-input"
          type="text"
          className="input"
          placeholder="CEP (opcional — ajuda a achar endereço em cidade pequena)"
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCepLookup(e); }}
          style={{ maxWidth: '280px' }}
        />
        <button type="button" onClick={handleCepLookup} className="btn btn--secondary" disabled={cepLoading} style={{ whiteSpace: 'nowrap' }}>
          {cepLoading ? 'Consultando...' : 'Buscar por CEP'}
        </button>
      </div>
      {cepError && <p className="form-error" style={{ marginBottom: 'var(--space-2)' }}>{cepError}</p>}

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

      {approximate && results.length > 0 && (
        <p className="text-muted text-xs" style={{ marginTop: 'var(--space-2)' }}>
          ⚠️ Não achei o endereço exato — isto é uma aproximação (bairro/cidade). Confira e ajuste os campos manualmente, principalmente o número.
        </p>
      )}

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
