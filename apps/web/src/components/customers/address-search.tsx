'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { geocodeAddress, type GeocodeResult } from '@/app/actions/geocoding';

export type AddressSearchResult = GeocodeResult;

export function AddressSearch({ onSelect }: { onSelect: (result: AddressSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [approximate, setApproximate] = useState(false);

  // Mesmo com o Google Geocoding (cobertura bem melhor que o Nominatim usado
  // antes), uma busca digitada estranha ainda pode não achar nada. Em vez de
  // simplesmente falhar, afrouxa aos poucos (tira o último pedaço separado
  // por vírgula) até achar ao menos algo aproximado.
  async function searchWithFallback(q: string) {
    let attempt = q;
    let data = await geocodeAddress(attempt);
    let loosened = false;
    while (data.length === 0 && attempt.includes(',')) {
      attempt = attempt.slice(0, attempt.lastIndexOf(',')).trim();
      if (!attempt) break;
      data = await geocodeAddress(attempt);
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

  function handlePick(r: GeocodeResult) {
    onSelect(r);
    setResults([]);
    setApproximate(false);
    setQuery(r.displayName);
  }

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="flex gap-2">
        <input
          id="address-search-input"
          type="text"
          className="input"
          placeholder="Rua, número, bairro, cidade - UF"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
        />
        <button type="button" onClick={handleSearch} className="btn btn--secondary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? 'Buscando...' : <><Search size={16} /> Buscar</>}
        </button>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: 'var(--space-2)' }}>
        💡 Pra achar certo, separe por vírgula: rua e número, bairro, cidade - UF. Ex: <em>Teotônio Vilela, 315, Liberdade, Parauapebas - PA</em>. Quanto mais completo, melhor o resultado — em cidade pequena, evite deixar só o nome da rua.
      </p>

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
              {r.displayName}
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
