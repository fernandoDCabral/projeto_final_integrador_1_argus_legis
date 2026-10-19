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
        <div style={marcaStyle}>
          <div style={seloStyle} aria-hidden="true">A</div>
          <div style={nomeMarcaStyle}>Argus Legis</div>
        </div>

        {enviado ? (
          <>
            <h1 style={titleStyle}>Verifique seu e-mail</h1>
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
            <h1 style={titleStyle}>Esqueci minha senha</h1>
            <p style={subtitleStyle}>
              Informe o e-mail da sua conta. Enviaremos um link para você
              cadastrar uma senha nova.
            </p>

            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={fieldStyle}>
                <label htmlFor="campo-1" style={labelStyle}>E-mail</label>
                <input id="campo-1"
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
                {enviando ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </>
        )}

        <div style={rodapeLinkStyle}><button type="button" onClick={onVoltarParaLogin} style={linkStyle}>
          Voltar para o login
        </button></div>
      </div>
    </div>
  );
}

// --- ESTILOS (identidade da Spec 007: petróleo, areia e cobre) ---
const FONTE_TITULO = '"EB Garamond", Georgia, serif';

const containerStyle = {
  minHeight: '100vh', width: '100%', display: 'flex',
  justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3EFE7',
  padding: '30px 16px', boxSizing: 'border-box' as const
};

const cardStyle = {
  backgroundColor: '#FFFFFF', padding: '32px', border: '1px solid #DDD6C9',
  borderRadius: '10px', width: '420px', maxWidth: '100%',
  boxSizing: 'border-box' as const, boxShadow: '0 12px 32px rgba(23,36,43,0.08)'
};

const marcaStyle = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' };
const seloStyle = {
  width: '40px', height: '40px', border: '1.5px solid #D49A6E', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: FONTE_TITULO, fontSize: '22px', fontWeight: 700, color: '#A35A2E'
};
const nomeMarcaStyle = {
  fontFamily: FONTE_TITULO, fontSize: '24px', fontWeight: 600, letterSpacing: '0.04em', color: '#1E3D4C'
};

const titleStyle = {
  fontFamily: FONTE_TITULO, fontSize: '32px', fontWeight: 600, color: '#1E3D4C', margin: '0 0 8px'
};
const subtitleStyle = {
  color: '#55626A', fontSize: '15px', marginTop: 0, marginBottom: '22px', lineHeight: 1.5
};
const formStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: '14px'
};
const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const labelStyle = { fontWeight: 600, color: '#17242B', fontSize: '14px' };
const inputStyle = {
  padding: '10px 12px', borderRadius: '6px', border: '1px solid #C9C1B2',
  backgroundColor: '#FFFFFF', color: '#17242B', fontSize: '15px', minHeight: '46px',
  width: '100%', boxSizing: 'border-box' as const
};
const erroStyle = { color: '#7E2424', fontSize: '14px', margin: 0, fontWeight: 600 };
const buttonStyle = {
  backgroundColor: '#1E3D4C', color: '#F1ECE2', padding: '12px 18px', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '15px',
  minHeight: '48px', marginTop: '8px'
};
const linkStyle = {
  background: 'none', border: 'none', borderBottom: '1px solid #D49A6E', color: '#1E3D4C',
  cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: 0, minHeight: '32px'
};
const sucessoStyle = {
  backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c5e3c8',
  padding: '14px', borderRadius: '6px', fontSize: '14px', lineHeight: 1.5,
  marginBottom: '16px'
};
const dicaStyle = { color: '#55626A', fontSize: '14px', lineHeight: 1.5, marginBottom: 0 };
const rodapeLinkStyle = { marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #DDD6C9' };
