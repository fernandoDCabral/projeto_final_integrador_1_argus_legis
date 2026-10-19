import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onIrParaCadastro: () => void;
  onIrParaEsqueciSenha: () => void;
}

export default function Login({ onIrParaCadastro, onIrParaEsqueciSenha }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(''); // Limpa erros anteriores

    try {
      await login({ email, password });
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      
      // Esse bloco lida com situações de erro string ou array vindas do FastAPI
      if (Array.isArray(detail)) {
        setErro(`Erro de formulário: ${detail[0].loc[1]} ${detail[0].msg}`);
      } else if (typeof detail === 'string') {
        setErro(detail);
      } else {
        setErro("Erro ao conectar com o servidor.");
      }
    }
  };

  return (
    <div style={paginaStyle}>
      {/* Lado da marca (no celular fica em cima, pelo flex-wrap) */}
      <section style={ladoMarcaStyle} aria-label="Argus Legis">
        <div style={marcaStyle}>
          <div style={seloStyle} aria-hidden="true">A</div>
          <div style={nomeMarcaStyle}>Argus Legis</div>
        </div>
        <p style={fraseStyle}>
          Onde você estiver, o caso está com você.
        </p>
        <div style={rodapeMarcaStyle}>Gestão de prazos processuais · Fortaleza/CE</div>
      </section>

      <main style={ladoFormStyle}>
        <form onSubmit={handleSubmit} style={formStyle} aria-labelledby="titulo-login">
          <h1 id="titulo-login" style={titleStyle}>Entrar</h1>
          <p style={subtitleStyle}>Acesse com o e-mail cadastrado pelo escritório.</p>

          <div>
            <label htmlFor="login-email" style={labelStyle}>E-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              style={inputStyle}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div style={linhaSenhaStyle}>
              <label htmlFor="login-senha" style={labelStyle}>Senha</label>
              <button type="button" onClick={onIrParaEsqueciSenha} style={linkStyle}>
                Esqueci a senha
              </button>
            </div>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              style={inputStyle}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {erro && <p style={erroStyle}>{erro}</p>}

          <button type="submit" style={buttonStyle}>Entrar</button>

          <div style={cadastroStyle}>
            Escritório ainda sem cadastro?{' '}
            <button type="button" onClick={onIrParaCadastro} style={linkStyle}>
              Criar conta
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// --- ESTILOS (identidade da Spec 007: petróleo, areia e cobre) ---
const FONTE_TITULO = '"EB Garamond", Georgia, serif';

const paginaStyle = {
  display: 'flex', flexWrap: 'wrap' as const, minHeight: '100vh', width: '100%',
  backgroundColor: '#F3EFE7'
};

const ladoMarcaStyle = {
  flex: '1 1 420px', minHeight: '320px', boxSizing: 'border-box' as const, padding: '56px',
  display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', gap: '40px',
  backgroundColor: '#1E3D4C', color: '#F1ECE2'
};

const marcaStyle = { display: 'flex', alignItems: 'center', gap: '12px' };
const seloStyle = {
  width: '40px', height: '40px', border: '1.5px solid #D49A6E', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: FONTE_TITULO, fontSize: '22px', fontWeight: 700, color: '#D49A6E'
};
const nomeMarcaStyle = {
  fontFamily: FONTE_TITULO, fontSize: '24px', fontWeight: 600, letterSpacing: '0.04em'
};
const fraseStyle = {
  maxWidth: '460px', margin: 0, fontFamily: FONTE_TITULO, fontSize: '44px', fontWeight: 500, lineHeight: 1.1
};
const rodapeMarcaStyle = { color: '#B7C6CD', fontSize: '14px' };

const ladoFormStyle = {
  flex: '1 1 420px', boxSizing: 'border-box' as const, padding: '48px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const formStyle = {
  width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column' as const, gap: '18px'
};

const titleStyle = {
  margin: 0, fontFamily: FONTE_TITULO, fontSize: '36px', fontWeight: 600, color: '#1E3D4C'
};

const subtitleStyle = { margin: '-10px 0 6px', color: '#55626A' };

const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' };

const linhaSenhaStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };

const inputStyle = {
  width: '100%', boxSizing: 'border-box' as const, minHeight: '46px', padding: '10px 12px',
  border: '1px solid #C9C1B2', borderRadius: '6px', backgroundColor: '#FFFFFF',
  color: '#17242B', fontSize: '15px'
};

const erroStyle = { margin: 0, color: '#7E2424', fontSize: '14px', fontWeight: 600 };

const buttonStyle = {
  width: '100%', minHeight: '48px', padding: '12px 18px', border: 'none', borderRadius: '6px',
  backgroundColor: '#1E3D4C', color: '#F1ECE2', cursor: 'pointer', fontSize: '15px', fontWeight: 600
};

const cadastroStyle = {
  paddingTop: '18px', borderTop: '1px solid #DDD6C9', color: '#55626A', textAlign: 'center' as const
};

const linkStyle = {
  display: 'inline-flex', alignItems: 'center', minHeight: '32px', padding: 0,
  background: 'none', border: 'none', borderBottom: '1px solid #D49A6E',
  color: '#1E3D4C', cursor: 'pointer', fontSize: '14px', fontWeight: 600
};
