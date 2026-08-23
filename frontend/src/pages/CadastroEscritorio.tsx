import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onVoltarParaLogin: () => void;
}

// Aplica a máscara 00.000.000/0000-00 conforme o usuário digita.
// O backend limpa a pontuação de qualquer forma, isso é só conforto de leitura.
const formatarCnpj = (valor: string) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export default function CadastroEscritorio({ onVoltarParaLogin }: Props) {
  const { registrarEscritorio } = useAuth();

  const [form, setForm] = useState({
    nome_fantasia: '',
    cnpj: '',
    admin_nome: '',
    admin_email: '',
    admin_oab: '',
    admin_senha: '',
  });
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const atualizar = (campo: keyof typeof form, valor: string) =>
    setForm((anterior) => ({ ...anterior, [campo]: valor }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (form.admin_senha !== confirmacaoSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (form.admin_senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      await registrarEscritorio({
        ...form,
        cnpj: form.cnpj.replace(/\D/g, ''),
        admin_oab: form.admin_oab.trim() || null,
      });
      // Em caso de sucesso o AuthContext já autentica e o App troca de tela
    } catch (error: any) {
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        // 422 do Pydantic: detail[].loc termina no nome do campo
        const campo = detail[0].loc?.[detail[0].loc.length - 1];
        setErro(`${campo}: ${detail[0].msg}`);
      } else if (typeof detail === 'string') {
        setErro(detail);
      } else {
        setErro('Erro ao conectar com o servidor.');
      }
      setEnviando(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Argus Legis" style={logoStyle} />
        <h2 style={titleStyle}>Criar conta do escritório</h2>
        <p style={subtitleStyle}>
          Você será cadastrado como administrador e poderá convidar os advogados
          em seguida.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <span style={legendStyle}>Escritório</span>

          <div style={fieldStyle}>
            <label style={labelStyle}>Nome fantasia</label>
            <input
              type="text"
              style={inputStyle}
              required
              value={form.nome_fantasia}
              onChange={(e) => atualizar('nome_fantasia', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>CNPJ</label>
            <input
              type="text"
              style={inputStyle}
              required
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={(e) => atualizar('cnpj', formatarCnpj(e.target.value))}
            />
          </div>

          <span style={legendStyle}>Administrador</span>

          <div style={fieldStyle}>
            <label style={labelStyle}>Nome completo</label>
            <input
              type="text"
              style={inputStyle}
              required
              value={form.admin_nome}
              onChange={(e) => atualizar('admin_nome', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              style={inputStyle}
              required
              value={form.admin_email}
              onChange={(e) => atualizar('admin_email', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>OAB (opcional)</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Ex: 123456/CE"
              value={form.admin_oab}
              onChange={(e) => atualizar('admin_oab', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Senha</label>
            <input
              type="password"
              style={inputStyle}
              required
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              value={form.admin_senha}
              onChange={(e) => atualizar('admin_senha', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Confirmar senha</label>
            <input
              type="password"
              style={inputStyle}
              required
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
            />
          </div>

          {erro && <p style={erroStyle}>{erro}</p>}

          <button type="submit" style={buttonStyle} disabled={enviando}>
            {enviando ? 'CRIANDO...' : 'CRIAR CONTA'}
          </button>
        </form>

        <button type="button" onClick={onVoltarParaLogin} style={linkStyle}>
          Já tenho conta — voltar para o login
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
  width: '420px', maxWidth: '92vw', textAlign: 'center' as const,
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};

const logoStyle = { width: '90px', marginBottom: '12px' };

const titleStyle = { color: '#1a2a3a', marginBottom: '6px', fontSize: '1.4rem' };

const subtitleStyle = {
  color: '#666', fontSize: '13px', marginTop: 0, marginBottom: '22px',
  lineHeight: 1.5
};

const formStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: '14px',
  textAlign: 'left' as const
};

const legendStyle = {
  fontSize: '11px', fontWeight: 'bold' as const, letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: '#D4AF37',
  borderBottom: '1px solid #eee', paddingBottom: '6px', marginTop: '4px'
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
