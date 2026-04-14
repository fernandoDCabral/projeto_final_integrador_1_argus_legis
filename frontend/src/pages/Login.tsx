import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isCadastro, setIsCadastro] = useState(false);
  const [perfil, setPerfil] = useState('Advogado');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No futuro, aqui enviaremos para o Python/PostgreSQL [cite: 119]
    onLogin();
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Argus Legis" style={logoStyle} />
        
        <h2 style={titleStyle}>{isCadastro ? 'Cadastro' : 'Acesso Argus Legis'}</h2>

        <form onSubmit={handleSubmit} style={formStyle}>
          {isCadastro && (
            <div style={rowStyle}>
              <label style={labelStyle}>Nome:</label>
              <input type="text" style={inputStyle} required />
            </div>
          )}

          <div style={rowStyle}>
            <label style={labelStyle}>E-mail:</label>
            <input type="email" style={inputStyle} required />
          </div>
          
          <div style={rowStyle}>
            <label style={labelStyle}>Senha:</label>
            <input type="password" style={inputStyle} required />
          </div>

          {isCadastro && (
            <div style={rowStyle}>
              <label style={labelStyle}>Tipo:</label>
              <select 
                value={perfil} 
                onChange={(e) => setPerfil(e.target.value)} 
                style={inputStyle}
              >
                <option value="Advogado">Advogado</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
          )}
          
          <button type="submit" style={buttonStyle}>
            {isCadastro ? 'Cadastrar' : 'ENTRAR'}
          </button>
        </form>

        <p style={toggleTextStyle}>
          {isCadastro ? 'Já possui uma conta? ' : 'Não tem uma conta? '}
          <span 
            onClick={() => setIsCadastro(!isCadastro)} 
            style={linkStyle}
          >
            {isCadastro ? 'Faça Login' : 'Cadastre-se'}
          </span>
        </p>
      </div>
    </div>
  );
}

// --- ESTILOS (Baseados na sua imagem) ---
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

const toggleTextStyle = { marginTop: '15px', fontSize: '14px' };

const linkStyle = { color: 'red', cursor: 'pointer', fontWeight: 'bold' as const };