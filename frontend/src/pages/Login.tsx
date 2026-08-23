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
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Argus Legis" style={logoStyle} />
        
        <h2 style={titleStyle}>Acesso Argus Legis</h2>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>E-mail:</label>
            <input 
              type="email" 
              style={inputStyle}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div style={rowStyle}>
            <label style={labelStyle}>Senha:</label>
            <input 
              type="password" 
              style={inputStyle} 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          
          {erro && (
            <p style={{color: 'red', fontSize: '13px', marginBottom: '10px'}}>
              {erro}
            </p>
          )}

          <button type="submit" style={buttonStyle}>
            ENTRAR
          </button>
        </form>

        <p style={{ ...rodapeStyle, marginTop: '16px' }}>
          <button type="button" onClick={onIrParaEsqueciSenha} style={linkStyle}>
            Esqueci minha senha
          </button>
        </p>

        <p style={rodapeStyle}>
          Ainda não tem escritório cadastrado?{' '}
          <button type="button" onClick={onIrParaCadastro} style={linkStyle}>
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}

// --- ESTILOS ---
const containerStyle = {
  height: '100vh', width: '100vw', display: 'flex', 
  justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2a3a'
};

const cardStyle = {
  backgroundColor: 'white', padding: '30px', borderRadius: '10px', 
  width: '380px', textAlign: 'center' as const, boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};

const logoStyle = { width: '120px', marginBottom: '15px' };

const titleStyle = { color: '#1a2a3a', marginBottom: '25px', fontSize: '1.4rem' };

const formStyle = { display: 'flex', flexDirection: 'column' as const, gap: '15px' };

const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const labelStyle = { fontWeight: 'bold', color: '#333', minWidth: '60px', textAlign: 'left' as const };

const inputStyle = { 
  flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginLeft: '10px', backgroundColor: '#e8e8e8'
};

const buttonStyle = {
  backgroundColor: '#D4AF37', color: 'white', padding: '10px', border: 'none',
  borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' as const, marginTop: '10px'
};

const rodapeStyle = {
  marginTop: '22px', marginBottom: 0, fontSize: '13px', color: '#666'
};

const linkStyle = {
  background: 'none', border: 'none', color: '#1a2a3a', cursor: 'pointer',
  fontSize: '13px', fontWeight: 'bold' as const, textDecoration: 'underline', padding: 0
};