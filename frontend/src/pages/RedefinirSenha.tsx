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
        <div style={marcaStyle}>
          <div style={seloStyle} aria-hidden="true">A</div>
          <div style={nomeMarcaStyle}>Argus Legis</div>
        </div>

        {estado === 'validando' && (
          <>
            <h1 style={titleStyle}>Verificando link...</h1>
            <p style={subtitleStyle}>Só um instante.</p>
          </>
        )}

        {estado === 'invalido' && (
          <>
            <h1 style={titleStyle}>Link inválido</h1>
            <div style={erroBoxStyle}>{erro}</div>
            <p style={subtitleStyle}>
              Links de redefinição valem por 1 hora e só podem ser usados uma vez.
            </p>
          </>
        )}

        {estado === 'concluido' && (
          <>
            <h1 style={titleStyle}>Senha alterada!</h1>
            <div style={sucessoStyle}>
              Sua nova senha já está valendo. Use-a para entrar no sistema.
            </div>
          </>
        )}

        {estado === 'valido' && (
          <>
            <h1 style={titleStyle}>Cadastrar nova senha</h1>
            <p style={subtitleStyle}>
              Olá, <strong>{dono?.nome}</strong>. Você está redefinindo a senha
              da conta <strong>{dono?.email}</strong>.
            </p>

            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={fieldStyle}>
                <label htmlFor="campo-1" style={labelStyle}>Nova senha</label>
                <input id="campo-1"
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
                <label htmlFor="campo-2" style={labelStyle}>Confirmar nova senha</label>
                <input id="campo-2"
                  type="password"
                  style={inputStyle}
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>

              {erro && <p style={erroStyle}>{erro}</p>}

              <button type="submit" style={buttonStyle} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}

        {estado !== 'validando' && (
          <div style={rodapeLinkStyle}><button type="button" onClick={onConcluir} style={linkStyle}>
            Ir para o login
          </button></div>
        )}
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
const erroBoxStyle = {
  backgroundColor: '#F4E1DF', color: '#7E2424', border: '1px solid #E3C2BE',
  padding: '14px', borderRadius: '6px', fontSize: '14px', lineHeight: 1.5,
  marginBottom: '16px'
};
const rodapeLinkStyle = { marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #DDD6C9' };
