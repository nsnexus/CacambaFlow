'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Campo de senha com botão de mostrar/ocultar — reusado em qualquer formulário
// que define ou troca senha (cadastro de motorista, troca de senha de
// motorista, troca da própria senha do admin).
export function PasswordField({
  id,
  name,
  label,
  error,
  required = true,
  minLength = 6,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          className="input"
          required={required}
          minLength={minLength}
          placeholder="Mínimo 6 caracteres"
          style={{ paddingRight: '40px' }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center',
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
