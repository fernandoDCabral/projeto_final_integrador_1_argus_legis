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
        <div style={marcaStyle}>
          <div style={seloStyle} aria-hidden="true">A</div>
          <div style={nomeMarcaStyle}>Argus Legis</div>
        </div>
        <h1 style={titleStyle}>Criar conta do escritório</h1>
        <p style={subtitleStyle}>
          Você será cadastrado como administrador e poderá convidar os advogados
          em seguida.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <span style={legendStyle}>Escritório</span>

          <div style={fieldStyle}>
            <label htmlFor="campo-1" style={labelStyle}>Nome fantasia</label>
            <input id="campo-1"
              type="text"
              style={inputStyle}
              required
              value={form.nome_fantasia}
              onChange={(e) => atualizar('nome_fantasia', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="campo-2" style={labelStyle}>CNPJ</label>
            <input id="campo-2"
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
            <label htmlFor="campo-3" style={labelStyle}>Nome completo</label>
            <input id="campo-3"
              type="text"
              style={inputStyle}
              required
              value={form.admin_nome}
              onChange={(e) => atualizar('admin_nome', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="campo-4" style={labelStyle}>E-mail</label>
            <input id="campo-4"
              type="email"
              style={inputStyle}
              required
              value={form.admin_email}
              onChange={(e) => atualizar('admin_email', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="campo-5" style={labelStyle}>OAB (opcional)</label>
            <input id="campo-5"
              type="text"
              style={inputStyle}
              placeholder="Ex: 123456/CE"
              value={form.admin_oab}
              onChange={(e) => atualizar('admin_oab', e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="campo-6" style={labelStyle}>Senha</label>
            <input id="campo-6"
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
            <label htmlFor="campo-7" style={labelStyle}>Confirmar senha</label>
            <input id="campo-7"
              type="password"
              style={inputStyle}
              required
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
            />
          </div>

          {erro && <p style={erroStyle}>{erro}</p>}

          <button type="submit" style={buttonStyle} disabled={enviando}>
            {enviando ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <div style={rodapeLinkStyle}><button type="button" onClick={onVoltarParaLogin} style={linkStyle}>
          Já tenho conta — voltar para o login
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
const legendStyle = {
  fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  color: '#A35A2E', borderBottom: '1px solid #DDD6C9', paddingBottom: '6px', marginTop: '4px'
};
const rodapeLinkStyle = { marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #DDD6C9' };
