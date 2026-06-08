import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Estados para o Advogado
  const [meusProcessos, setMeusProcessos] = useState<any[]>([]);
  const [piscinaProcessos, setPiscinaProcessos] = useState<any[]>([]);
  
  // Estados para o Admin
  const [advogados, setAdvogados] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [formUsuario, setFormUsuario] = useState({
    nome: "", email: "", senha: "", oab: ""
  });

  // Estados Globais
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // --- FUNÇÕES DE LÓGICA (BACKEND) ---

  const carregarDados = async () => {
    setCarregando(true);
    try {
      if (user?.perfil === "ADMIN") {
        // Se for ADMIN, busca a lista de usuários para a tabela
        const response = await api.get('/usuarios/');
        // Filtra para mostrar apenas advogados na tabela
        const listaAdvogados = response.data.filter((u: any) => u.perfil === "ADVOGADO");
        setAdvogados(listaAdvogados);
      } else {
        // Se for ADVOGADO, busca os processos
        const response = await api.get('/processos/');
        const todosProcessos = response.data;
        setMeusProcessos(todosProcessos.filter((p: any) => p.responsavel?.id === user?.id));
        setPiscinaProcessos(todosProcessos.filter((p: any) => p.responsavel === null));
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setErro("Não foi possível carregar as informações do painel.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      carregarDados();
    }
  }, [user]);

  // Ação exclusiva do ADVOGADO
  const handleAssumirProcesso = async (processo: any) => {
    try {
      await api.patch(`/processos/${processo.id}`, { responsavel_id: user?.id });
      await api.post('/prazos/', {
        processo_id: processo.id,
        descricao: `Prazo Inicial (${processo.tipo_processo})`,
        data_publicacao: processo.data_cadastro, 
        finalizado: false
      });
      await carregarDados();
    } catch (error) {
      alert("Não foi possível assumir este processo.");
    }
  };

  // Ação exclusiva do ADMIN (Cadastro de Usuário)
  const handleCadastrarAdvogado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/usuarios/', {
        nome: formUsuario.nome,
        email: formUsuario.email,
        senha: formUsuario.senha,
        oab: formUsuario.oab,
        perfil: "ADVOGADO" // Fixo, pois o foco é cadastrar advogados
      });
      
      alert("Advogado cadastrado com sucesso!");
      setModalAberto(false);
      setFormUsuario({ nome: "", email: "", senha: "", oab: "" }); // Limpa o form
      await carregarDados(); // Recarrega a tabela
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar advogado. Verifique os dados.");
    }
  };

  // --- FUNÇÕES AUXILIARES DE UI ---
  const analisarPrazo = (dataVencimento?: string) => { /* ... sua lógica de cores intacta ... */ 
      if (!dataVencimento) return { cor: "#95a5a6", texto: "Sem prazo", dias: null }; 
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); 
      const vencimento = new Date(dataVencimento); 
      vencimento.setHours(0, 0, 0, 0);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDias < 0) return { cor: "#c0392b", texto: "Vencido", dias: diffDias }; 
      if (diffDias <= 3) return { cor: "#f39c12", texto: `Vence em ${diffDias} dias`, dias: diffDias }; 
      return { cor: "#27ae60", texto: `Vence em ${diffDias} dias`, dias: diffDias }; 
  };

  const formatarData = (dataStr: string) => { /* ... sua lógica de formatação intacta ... */
      if (!dataStr) return "N/A";
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };


  // --- COMPONENTES DA TELA ---

  // TELA DO ADMIN
  const renderPainelAdmin = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#1a2a3a" }}>Equipe Jurídica (Advogados)</h3>
        <button onClick={() => setModalAberto(true)} style={styles.btnAcaoBase}>
          ➕ Novo Advogado
        </button>
      </div>

      <div style={styles.cardInfo}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px" }}>Nome</th>
              <th style={{ padding: "12px" }}>E-mail</th>
              <th style={{ padding: "12px" }}>OAB</th>
            </tr>
          </thead>
          <tbody>
            {advogados.length > 0 ? advogados.map(adv => (
              <tr key={adv.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{adv.nome}</td>
                <td style={{ padding: "12px" }}>{adv.email}</td>
                <td style={{ padding: "12px" }}>{adv.oab || "N/A"}</td>
              </tr>
            )) : (
              <tr><td colSpan={3} style={{ padding: "12px", textAlign: "center", color: "#666" }}>Nenhum advogado cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* O MODAL DE CADASTRO */}
      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, borderBottom: "2px solid #D4AF37", paddingBottom: "10px" }}>Cadastrar Advogado</h3>
            <form onSubmit={handleCadastrarAdvogado} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={styles.label}>Nome Completo</label>
                <input required style={styles.input} type="text" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>E-mail</label>
                <input required style={styles.input} type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>Senha de Acesso</label>
                <input required style={styles.input} type="password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>Número da OAB</label>
                <input required style={styles.input} type="text" value={formUsuario.oab} onChange={e => setFormUsuario({...formUsuario, oab: e.target.value})} />
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setModalAberto(false)} style={styles.btnCancelar}>Cancelar</button>
                <button type="submit" style={styles.btnSalvar}>Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // TELA DO ADVOGADO
  const renderPainelAdvogado = () => (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Coluna 1: Meus Processos (Mantida exatamente como você fez) */}
      <div style={styles.column}>
        <h3 style={styles.tituloColunaAzul}>📋 Meus Processos Ativos</h3>
        {meusProcessos.length > 0 ? meusProcessos.map((processo) => {
          const dataVencimentoReal = processo.prazos && processo.prazos.length > 0 ? processo.prazos[0].data_vencimento : undefined;
          const infoPrazo = analisarPrazo(dataVencimentoReal);
          return (
            <div key={processo.id} style={{ ...styles.processCard, borderLeft: `6px solid ${infoPrazo.cor}` }}>
               {/* Cabeçalho */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#1a2a3a', fontSize: '1.1rem' }}>{processo.cnj || "Sem Título/Número"}</h4>
                  <span style={{ ...styles.badgePrazo, backgroundColor: infoPrazo.cor + "20", color: infoPrazo.cor === '#95a5a6' ? '#333' : infoPrazo.cor, border: `1px solid ${infoPrazo.cor}` }}>
                    ⏳ {infoPrazo.texto}
                  </span>
                </div>
                {/* Corpo do Card */}
                <div style={styles.gridInfo}>
                  <div><span style={styles.label}>Tribunal:</span><span style={styles.valor}>{processo.tribunal}</span></div>
                  <div><span style={styles.label}>Tipo:</span><span style={styles.valor}>{processo.tipo_processo}</span></div>
                  <div><span style={styles.label}>Início do Prazo:</span><span style={styles.valor}>{formatarData(processo.data_cadastro)}</span></div>
                  <div><span style={styles.label}>Vencimento:</span><span style={styles.valor} className="data-destaque">{dataVencimentoReal ? formatarData(dataVencimentoReal) : "Sem prazo definido"}</span></div>
                </div>
                <span style={styles.badgeAtivo}>{processo.status}</span>
            </div>
          );
        }) : <p style={{ color: "#666" }}>Nenhum processo sob sua responsabilidade.</p>}
      </div>

      {/* Coluna 2: Piscina (Mantida exatamente como você fez) */}
      <div style={styles.column}>
        <h3 style={styles.tituloColunaVermelha}>⚠️ Piscina (Aguardando Adoção)</h3>
        {piscinaProcessos.length > 0 ? piscinaProcessos.map((processo) => (
          <div key={processo.id} style={styles.processCardOrphan}>
            <h4 style={{ margin: "0 0 10px 0" }}>{processo.cnj}</h4>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Ação:</strong> {processo.tipo_processo}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Tribunal:</strong> {processo.tribunal}</p>
            <button onClick={() => handleAssumirProcesso(processo)} style={styles.btnAssumir}>Assumir Caso</button>
          </div>
        )) : <p style={{ color: "#666" }}>A piscina está vazia!</p>}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* MENU LATERAL */}
      <aside style={styles.sidebar}>
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img src="/logo.jpg" alt="Logo" style={styles.logo} />
            <h2 style={{ color: "#D4AF37", marginTop: "10px" }}>Argus Legis</h2>
          </div>
          <ul style={{ listStyle: "none", padding: 0, lineHeight: "3em" }}>
            {/* Renderização Condicional no Menu */}
            {user?.perfil === "ADMIN" ? (
              <li style={styles.menuItemAtivo}>👥 Cadastro</li>
            ) : (
              <li style={styles.menuItemAtivo}>📂 Processos</li>
            )}
          </ul>
        </div>
        <button onClick={logout} style={styles.logoutButton}>🚪 Sair do Sistema</button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h3 style={{ margin: 0 }}>Painel Operacional</h3>
        </header>

        <section style={{ padding: "30px" }}>
          {/* CARTÃO DE BOAS VINDAS (Comum a todos) */}
          <div style={styles.cardInfoTop}>
            <h2 style={{ marginTop: 0 }}>Bem-vindo, {user?.nome || user?.email || "Usuário"}!</h2>
            <p style={{ color: "#666", marginBottom: 0 }}>
              Perfil ativo: <strong>{user?.perfil || "Desconhecido"}</strong>
            </p>
          </div>

          {erro && <p style={{ color: "red", fontWeight: "bold" }}>{erro}</p>}
          
          {carregando ? (
            <p>Carregando painel...</p>
          ) : (
            // AQUI ACONTECE A MÁGICA DA SEPARAÇÃO DAS TELAS
            user?.perfil === "ADMIN" ? renderPainelAdmin() : renderPainelAdvogado()
          )}
        </section>
      </main>
    </div>
  );
}

// --- ESTILOS ATUALIZADOS ---
const styles = {
  container: { display: "flex", height: "100vh", width: "100vw", margin: 0, fontFamily: "sans-serif" },
  sidebar: { width: "250px", backgroundColor: "#1a2a3a", color: "white", padding: "20px", display: "flex", flexDirection: "column" as const, boxSizing: "border-box" as const },
  logo: { width: "100px", borderRadius: "8px", objectFit: "cover" as const },
  menuItemAtivo: { cursor: "pointer", borderBottom: "2px solid #D4AF37", paddingBottom: "5px", color: "#D4AF37", fontWeight: "bold" },
  logoutButton: { backgroundColor: "#c0392b", color: "white", border: "none", padding: "12px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" as const, width: "100%" },
  main: { flex: 1, backgroundColor: "#f5f5f5", overflowY: "auto" as const },
  header: { padding: "15px 30px", backgroundColor: "white", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  cardInfoTop: { backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "20px" },
  cardInfo: { backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" },
  column: { flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #ddd", minHeight: "400px" },
  tituloColunaAzul: { color: "#1a2a3a", borderBottom: "2px solid #D4AF37", paddingBottom: "10px", marginTop: 0 },
  tituloColunaVermelha: { color: "#c0392b", borderBottom: "2px solid #c0392b", paddingBottom: "10px", marginTop: 0 },
  processCard: { borderTop: "1px solid #eee", borderRight: "1px solid #eee", borderBottom: "1px solid #eee", padding: "15px", borderRadius: "8px", marginBottom: "15px", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  processCardOrphan: { border: "1px solid #ffdce0", padding: "15px", borderRadius: "8px", marginBottom: "15px", backgroundColor: "#fff5f5", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  badgePrazo: { fontSize: "12px", padding: "4px 8px", borderRadius: "12px", fontWeight: "bold" as const, whiteSpace: "nowrap" as const },
  gridInfo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px", fontSize: "14px" },
  label: { color: "#666", marginRight: "5px" },
  valor: { fontWeight: "bold", color: "#333" },
  badgeAtivo: { display: "inline-block", backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" as const },
  btnAssumir: { marginTop: "10px", backgroundColor: "#c0392b", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const, width: "100%" },
  
  // NOVOS ESTILOS PARA O ADMIN E MODAL
  btnAcaoBase: { backgroundColor: "#1a2a3a", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" as const },
  modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "8px", width: "400px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" },
  input: { width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" as const },
  btnCancelar: { flex: 1, padding: "10px", backgroundColor: "#ecf0f1", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const },
  btnSalvar: { flex: 1, padding: "10px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const }
};