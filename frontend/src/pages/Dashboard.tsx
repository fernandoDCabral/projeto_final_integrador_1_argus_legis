import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [meusProcessos, setMeusProcessos] = useState<any[]>([]);
  const [piscinaProcessos, setPiscinaProcessos] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // 1. Função para calcular a urgência do prazo e retornar a cor correta
  const analisarPrazo = (dataVencimento?: string) => {
    if (!dataVencimento) return { cor: "#95a5a6", texto: "Sem prazo", dias: null }; 

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas os dias
    
    // Considerando que a data venha no formato YYYY-MM-DD
    const vencimento = new Date(dataVencimento); 
    vencimento.setHours(0, 0, 0, 0);

    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { cor: "#c0392b", texto: "Vencido", dias: diffDias }; // Vermelho
    if (diffDias <= 3) return { cor: "#f39c12", texto: `Vence em ${diffDias} dias`, dias: diffDias }; // Amarelo (Alerta)
    return { cor: "#27ae60", texto: `Vence em ${diffDias} dias`, dias: diffDias }; // Verde (Tranquilo)
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "N/A";
    const data = new Date(dataStr);
    // Adiciona o fuso horário para evitar problemas de exibição de dias
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // Função que busca processos onde o advogado é o responsável e
  // processos que não possuem responsáveis (piscina)
  const carregarProcessos = async () => {
    try {
      const response = await api.get('/processos/');
      const todosProcessos = response.data;

      const meus = todosProcessos.filter((p: any) => p.responsavel?.id === user?.id);
      const orfaos = todosProcessos.filter((p: any) => p.responsavel === null);

      setMeusProcessos(meus);
      setPiscinaProcessos(orfaos);
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
      setErro("Não foi possível carregar os processos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
        carregarProcessos();
    }
  }, [user]);

  const handleAssumirProcesso = async (processo: any) => {
    try {
      // Faz a requisição PATCH enviando apenas o campo `responsavel_id`
      // para vincular o advogado logado ao processo
      await api.patch(`/processos/${processo.id}`, {
        responsavel_id: user?.id
      });

      // Faz a requisição POST para gerar o prazo inicial
      await api.post('/prazos/', {
        processo_id: processo.id,
        descricao: `Prazo inicial (${processo.tipo_processo})`,
        data_publicacao: processo.data_cadastro,
        finalizado: false
      });

      // Caso dê certo, recarrega a tela para recalcular as colunas e prazos
      await carregarProcessos();
    } catch (error) {
      console.error("Erro ao assumir processo ou criar prazo:", error);
      alert("Não foi possível assumir este processo. Verifique suas permissões.");
    }
  };

  return (
    <div style={styles.container}>
      {/* MENU LATERAL - Refatorado conforme pedido 1 do Fernando */}
      <aside style={styles.sidebar}>
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img src="/logo.jpg" alt="Logo" style={styles.logo} />
            <h2 style={{ color: "#D4AF37", marginTop: "10px" }}>Argus Legis</h2>
          </div>

          <ul style={{ listStyle: "none", padding: 0, lineHeight: "3em" }}>
            {/* Apenas a opção Processos mantida */}
            <li style={styles.menuItemAtivo}>📂 Processos</li>
          </ul>
        </div>

        <button onClick={logout} style={styles.logoutButton}>
          🚪 Sair do Sistema
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h3 style={{ margin: 0 }}>Painel Operacional</h3>
        </header>

        <section style={{ padding: "30px" }}>
          {erro && <p style={{ color: "red", fontWeight: "bold" }}>{erro}</p>}
          {carregando && <p>Carregando processos...</p>}

          {!carregando && !erro && (
            <div style={{ display: "flex", gap: "20px" }}>
              
              {/* COLUNA 1: Meus Processos (Ajustada com os requisitos 2 e 3) */}
              <div style={styles.column}>
                <h3 style={styles.tituloColunaAzul}>📋 Meus Processos Ativos</h3>
                
                {meusProcessos.length > 0 ? (
                  meusProcessos.map((processo) => {
                    const dataVencimentoReal = processo.prazos && processo.prazos.length > 0
                      ? processo.prazos[0].data_vencimento
                      : undefined;
                    
                    const infoPrazo = analisarPrazo(dataVencimentoReal);

                    return (
                      <div 
                        key={processo.id} 
                        style={{
                          ...styles.processCard, 
                          borderLeft: `6px solid ${infoPrazo.cor}` // Borda dinâmica colorida
                        }}
                      >
                        {/* Cabeçalho do Card com Número e Tag de Prazo */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#1a2a3a', fontSize: '1.1rem' }}>
                            {processo.cnj || "Sem Título/Número"}
                          </h4>
                          <span style={{ 
                            ...styles.badgePrazo, 
                            backgroundColor: infoPrazo.cor + "20", // Cor de fundo transparente (20 em hex)
                            color: infoPrazo.cor === '#95a5a6' ? '#333' : infoPrazo.cor,
                            border: `1px solid ${infoPrazo.cor}`
                          }}>
                            ⏳ {infoPrazo.texto}
                          </span>
                        </div>

                        {/* Corpo do Card com Grid para não espremer a UI */}
                        <div style={styles.gridInfo}>
                          <div>
                            <span style={styles.label}>Tribunal:</span>
                            <span style={styles.valor}>{processo.tribunal}</span>
                          </div>
                          <div>
                            <span style={styles.label}>Tipo:</span>
                            <span style={styles.valor}>{processo.tipo_processo}</span>
                          </div>
                          <div>
                            <span style={styles.label}>Início do Prazo:</span>
                            <span style={styles.valor}>{formatarData(processo.data_cadastro)}</span>
                          </div>
                          <div>
                            <span style={styles.label}>Vencimento:</span>
                            <span style={styles.valor} className="data-destaque">
                              {dataVencimentoReal ? formatarData(dataVencimentoReal) : "Sem prazo definido"}
                            </span>
                          </div>
                        </div>

                        {/* Status no rodapé do card */}
                        <span style={styles.badgeAtivo}>{processo.status}</span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "#666" }}>Nenhum processo sob sua responsabilidade.</p>
                )}
              </div>

              {/* COLUNA 2: Piscina de Processos (Mantida intacta) */}
              <div style={styles.column}>
                <h3 style={styles.tituloColunaVermelha}>⚠️ Piscina (Aguardando Adoção)</h3>
                {piscinaProcessos.length > 0 ? (
                  piscinaProcessos.map((processo) => (
                    <div key={processo.id} style={styles.processCardOrphan}>
                      <h4 style={{ margin: "0 0 10px 0" }}>{processo.cnj}</h4>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Ação:</strong> {processo.tipo_processo}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Tribunal:</strong> {processo.tribunal}</p>
                      <button
                        onClick={() => handleAssumirProcesso(processo)} 
                        style={styles.btnAssumir}
                      >
                        Assumir Caso
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#666" }}>A piscina está vazia! Todos os processos possuem um responsável.</p>
                )}
              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- ESTILOS COMPONENTIZADOS ---
const styles = {
  container: { display: "flex", height: "100vh", width: "100vw", margin: 0, fontFamily: "sans-serif" },
  sidebar: { width: "250px", backgroundColor: "#1a2a3a", color: "white", padding: "20px", display: "flex", flexDirection: "column" as const, boxSizing: "border-box" as const },
  logo: { width: "100px", borderRadius: "8px", objectFit: "cover" as const },
  menuItemAtivo: { cursor: "pointer", borderBottom: "2px solid #D4AF37", paddingBottom: "5px", color: "#D4AF37", fontWeight: "bold" },
  logoutButton: { backgroundColor: "#c0392b", color: "white", border: "none", padding: "12px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" as const, width: "100%" },
  main: { flex: 1, backgroundColor: "#f5f5f5", overflowY: "auto" as const },
  header: { padding: "15px 30px", backgroundColor: "white", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
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
  btnAssumir: { marginTop: "10px", backgroundColor: "#c0392b", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const, width: "100%" }
};