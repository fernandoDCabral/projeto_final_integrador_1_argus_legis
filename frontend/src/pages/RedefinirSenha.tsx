import React, { useEffect, useState } from 'react';
import { validarTokenRecuperacao, redefinirSenha } from '../services/authService';

interface Props {
  token: string;
  onConcluir: () => void;
}

type Estado = 'validando' | 'valido' | 'invalido' | 'concluido';

export default function RedefinirSenha({ token, onConcluir }: Props) {
  const [estado, setEstado] = useState<Estado>('validando');
  const [dono, setDono] = useState<{ nome: string; email: string } | null>(null);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Confere o link antes de mostrar o formulário: sem isso o usuário digitaria
  // a senha nova duas vezes só para descobrir no fim que o link expirou
  useEffect(() => {
    let ativo = true;

    validarTokenRecuperacao(token)
      .then((dados) => {
        if (!ativo) return;
        setDono({ nome: dados.nome, email: dados.email });
        setEstado('valido');
      })
      .catch((error) => {
        if (!ativo) return;
        const detail = error.response?.data?.detail;
        setErro(typeof detail === 'string'
          ? detail
          : 'Link inválido ou expirado. Solicite uma nova redefinição.');
        setEstado('invalido');
      });

    return () => { ativo = false; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      setEstado('concluido');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErro(detail[0]?.msg ?? 'Não foi possível redefinir a senha.');
      } else {
        setErro(typeof detail === 'string' ? detail : 'Não foi possível redefinir a senha.');
      }
      setEnviando(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Argus Legis" style={logoStyle} />

        {estado === 'validando' && (
          <>
            <h2 style={titleStyle}>Verificando link...</h2>
            <p style={subtitleStyle}>Só um instante.</p>
          </>
        )}

        {estado === 'invalido' && (
          <>
            <h2 style={titleStyle}>Link inválido</h2>
            <div style={erroBoxStyle}>{erro}</div>
            <p style={subtitleStyle}>
              Links de redefinição valem por 1 hora e só podem ser usados uma vez.
            </p>
          </>
        )}

        {estado === 'concluido' && (
          <>
            <h2 style={titleStyle}>Senha alterada!</h2>
            <div style={sucessoStyle}>
              Sua nova senha já está valendo. Use-a para entrar no sistema.
            </div>
          </>
        )}

        {estado === 'valido' && (
          <>
            <h2 style={titleStyle}>Cadastrar nova senha</h2>
            <p style={subtitleStyle}>
              Olá, <strong>{dono?.nome}</strong>. Você está redefinindo a senha
              da conta <strong>{dono?.email}</strong>.
            </p>

            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nova senha</label>
                <input
                  type="password"
                  style={inputStyle}
                  required
                  autoFocus
                  minLength={8}
                  placeholder="Mínimo de 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Confirmar nova senha</label>
                <input
                  type="password"
                  style={inputStyle}
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>

              {erro && <p style={erroStyle}>{erro}</p>}

              <button type="submit" style={buttonStyle} disabled={enviando}>
                {enviando ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
              </button>
            </form>
          </>
        )}

        {estado !== 'validando' && (
          <button type="button" onClick={onConcluir} style={linkStyle}>
            Ir para o login
          </button>
        )}
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
const sucessoStyle = {
  backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c5e3c8',
  padding: '14px', borderRadius: '6px', fontSize: '14px', lineHeight: 1.5,
  textAlign: 'left' as const
};
const erroBoxStyle = {
  backgroundColor: '#fdecea', color: '#c0392b', border: '1px solid #f5c6c2',
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
