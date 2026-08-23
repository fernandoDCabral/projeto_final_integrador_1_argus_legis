import React, { useState } from 'react';
import { solicitarRecuperacao } from '../services/authService';

interface Props {
  onVoltarParaLogin: () => void;
}

export default function EsqueciSenha({ onVoltarParaLogin }: Props) {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      await solicitarRecuperacao(email);
      setEnviado(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      setErro(typeof detail === 'string' ? detail : 'Erro ao conectar com o servidor.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Argus Legis" style={logoStyle} />

        {enviado ? (
          <>
            <h2 style={titleStyle}>Verifique seu e-mail</h2>
            <div style={sucessoStyle}>
              Se <strong>{email}</strong> estiver cadastrado, enviamos um link
              para redefinir a senha.
            </div>
            <p style={dicaStyle}>
              O link vale por 1 hora e só pode ser usado uma vez. Não achou?
              Confira a caixa de spam.
            </p>
          </>
        ) : (
          <>
            <h2 style={titleStyle}>Esqueci minha senha</h2>
            <p style={subtitleStyle}>
              Informe o e-mail da sua conta. Enviaremos um link para você
              cadastrar uma senha nova.
            </p>

            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  style={inputStyle}
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {erro && <p style={erroStyle}>{erro}</p>}

              <button type="submit" style={buttonStyle} disabled={enviando}>
                {enviando ? 'ENVIANDO...' : 'ENVIAR LINK'}
              </button>
            </form>
          </>
        )}

        <button type="button" onClick={onVoltarParaLogin} style={linkStyle}>
          Voltar para o login
        </button>
      </div>
    </div>
  );
}

// --- ESTILOS ---
const containerStyle = {
  minHeight: '100vh', width: '100vw', display: 'flex',
  justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2a3a',
  padding: '30px 0', boxSizing: 'border-box' as const
};

const cardStyle = {
  backgroundColor: 'white', padding: '30px', borderRadius: '10px',
  width: '400px', maxWidth: '92vw', textAlign: 'center' as const,
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};

const logoStyle = { width: '90px', marginBottom: '12px' };
const titleStyle = { color: '#1a2a3a', marginBottom: '8px', fontSize: '1.4rem' };
const subtitleStyle = {
  color: '#666', fontSize: '13px', marginTop: 0, marginBottom: '22px', lineHeight: 1.5
};
const dicaStyle = {
  color: '#666', fontSize: '13px', lineHeight: 1.5, marginBottom: 0
};
const sucessoStyle = {
  backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c5e3c8',
  padding: '14px', borderRadius: '6px', fontSize: '14px', lineHeight: 1.5,
  marginBottom: '16px', textAlign: 'left' as const
};
const formStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: '14px',
  textAlign: 'left' as const
};
const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const labelStyle = { fontWeight: 'bold' as const, color: '#333', fontSize: '13px' };
const inputStyle = {
  padding: '9px', borderRadius: '4px', border: '1px solid #ccc',
  backgroundColor: '#f7f7f7', width: '100%', boxSizing: 'border-box' as const
};
const erroStyle = { color: '#c0392b', fontSize: '13px', margin: 0, fontWeight: 'bold' as const };
const buttonStyle = {
  backgroundColor: '#D4AF37', color: 'white', padding: '11px', border: 'none',
  borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' as const, marginTop: '8px'
};
const linkStyle = {
  background: 'none', border: 'none', color: '#1a2a3a', cursor: 'pointer',
  fontSize: '13px', marginTop: '18px', textDecoration: 'underline'
};
