import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import type { Cliente, TipoPessoa } from "../types/cliente";
import type { ConsultaDatajud } from "../types/datajud";
import {
  formatarCpf,
  formatarCnpj,
  formatarTelefone,
  somenteDigitos,
  documentoDoCliente,
  rotuloTipoPessoa,
  formatarDataSimples,
} from "../utils/formatos";

type AbaAdmin = "cadastro" | "clientes" | "processos";
type Aviso = { tipo: "sucesso" | "erro"; texto: string } | null;

const FORM_CLIENTE_VAZIO = {
  nome: "",
  tipo_pessoa: "FISICA" as TipoPessoa,
  documento: "",
  email: "",
  telefone: "",
  endereco: "",
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Estados para o Advogado
  const [meusProcessos, setMeusProcessos] = useState<any[]>([]);
  const [piscinaProcessos, setPiscinaProcessos] = useState<any[]>([]);

  // Estados para o Admin
  const [abaAdmin, setAbaAdmin] = useState<AbaAdmin>("cadastro");
  const [advogados, setAdvogados] = useState<any[]>([]);
  const [processosAdmin, setProcessosAdmin] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Modais do Admin
  const [modalAdvogadoAberto, setModalAdvogadoAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);

  // Confirmação de exclusão feita na própria linha da tabela, para não
  // depender de window.confirm
  const [clienteParaExcluir, setClienteParaExcluir] = useState<number | null>(null);

  // Formulários do Admin
  const [formUsuario, setFormUsuario] = useState({
    nome: "", email: "", senha: "", oab: ""
  });
  const [formProcesso, setFormProcesso] = useState({
    cnj: "", titulo: "", tribunal: "", tipo_processo: "", cliente_id: ""
  });
  const [formCliente, setFormCliente] = useState(FORM_CLIENTE_VAZIO);

  // Consulta ao DataJud dentro do modal de processo
  const [consultaDatajud, setConsultaDatajud] = useState<ConsultaDatajud | null>(null);
  const [buscandoDatajud, setBuscandoDatajud] = useState(false);
  const [erroDatajud, setErroDatajud] = useState("");

  // Estados Globais
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [carregando, setCarregando] = useState(true);

  // Extrai a mensagem de erro do FastAPI, que ora vem como string (HTTPException)
  // ora como lista de problemas de validação (Pydantic)
  const mensagemDeErro = (error: any, padrao: string) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) {
      const campo = detail[0]?.loc?.[detail[0].loc.length - 1];
      return `${campo}: ${detail[0]?.msg}`;
    }
    if (typeof detail === "string") return detail;
    return padrao;
  };

  // --- FUNÇÕES DE CARREGAMENTO DE DADOS ---

  const carregarDados = async () => {
    setCarregando(true);
    try {
      if (user?.perfil === "ADMIN") {
        // ADMIN busca a equipe, os processos e a carteira de clientes
        const [resUsuarios, resProcessos, resClientes] = await Promise.all([
          api.get('/usuarios/'),
          api.get('/processos/'),
          api.get('/clientes/')
        ]);

        setAdvogados(resUsuarios.data.filter((u: any) => u.perfil === "ADVOGADO"));
        setProcessosAdmin(resProcessos.data);
        setClientes(resClientes.data);
      } else {
        // ADVOGADO busca apenas a sua visão restrita de processos
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

  // --- AÇÕES DO ADVOGADO ---
  const handleAssumirProcesso = async (processo: any) => {
    try {
      await api.patch(`/processos/${processo.id}`, { responsavel_id: user?.id });
      await api.post('/prazos/', {
        processo_id: processo.id,
        descricao: `Prazo Inicial (${processo.tipo_processo})`,
        finalizado: false
      });
      await carregarDados();
    } catch (error) {
      setAviso({ tipo: "erro", texto: "Não foi possível assumir este processo." });
    }
  };

  // --- AÇÕES DO ADMIN ---
  const handleCadastrarAdvogado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/usuarios/', {
        nome: formUsuario.nome,
        email: formUsuario.email,
        senha: formUsuario.senha,
        oab: formUsuario.oab,
        perfil: "ADVOGADO"
      });

      setAviso({ tipo: "sucesso", texto: "Advogado cadastrado com sucesso!" });
      setModalAdvogadoAberto(false);
      setFormUsuario({ nome: "", email: "", senha: "", oab: "" });
      await carregarDados();
    } catch (error) {
      setAviso({
        tipo: "erro",
        texto: mensagemDeErro(error, "Erro ao cadastrar advogado.")
      });
    }
  };

  const handleCadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    const ehFisica = formCliente.tipo_pessoa === "FISICA";
    const documento = somenteDigitos(formCliente.documento);

    if (ehFisica && documento.length !== 11) {
      setAviso({ tipo: "erro", texto: "O CPF deve ter 11 dígitos." });
      return;
    }
    if (!ehFisica && documento.length !== 14) {
      setAviso({ tipo: "erro", texto: "O CNPJ deve ter 14 dígitos." });
      return;
    }

    try {
      const { data } = await api.post('/clientes/', {
        nome: formCliente.nome,
        tipo_pessoa: formCliente.tipo_pessoa,
        cpf: ehFisica ? documento : null,
        cnpj: ehFisica ? null : documento,
        email: formCliente.email,
        telefone: formCliente.telefone,
        endereco: formCliente.endereco,
      });

      setAviso({ tipo: "sucesso", texto: `Cliente "${data.nome}" cadastrado!` });
      setModalClienteAberto(false);
      setFormCliente(FORM_CLIENTE_VAZIO);
      await carregarDados();
    } catch (error) {
      setAviso({
        tipo: "erro",
        texto: mensagemDeErro(error, "Erro ao cadastrar cliente.")
      });
    }
  };

  const handleExcluirCliente = async (clienteId: number) => {
    try {
      await api.delete(`/clientes/${clienteId}`);
      setAviso({ tipo: "sucesso", texto: "Cliente removido." });
      setClienteParaExcluir(null);
      await carregarDados();
    } catch (error) {
      setClienteParaExcluir(null);
      setAviso({
        tipo: "erro",
        texto: mensagemDeErro(error, "Erro ao excluir cliente.")
      });
    }
  };

  const fecharModalProcesso = () => {
    setModalProcessoAberto(false);
    setFormProcesso({ cnj: "", titulo: "", tribunal: "", tipo_processo: "", cliente_id: "" });
    setConsultaDatajud(null);
    setErroDatajud("");
  };

  const handleBuscarDatajud = async () => {
    setBuscandoDatajud(true);
    setErroDatajud("");
    setConsultaDatajud(null);
    try {
      const { data } = await api.get<ConsultaDatajud>(
        `/datajud/${somenteDigitos(formProcesso.cnj)}`
      );
      setConsultaDatajud(data);
      // Tudo continua editável: são sugestões para o usuário conferir
      setFormProcesso(atual => ({
        ...atual,
        titulo: data.titulo_sugerido ?? atual.titulo,
        tribunal: data.tribunal,
        tipo_processo: data.tipo_processo_sugerido ?? atual.tipo_processo,
      }));
    } catch (error) {
      // O erro fica dentro do modal: o aviso geral apareceria atrás do overlay
      setErroDatajud(mensagemDeErro(error, "Não foi possível consultar o DataJud."));
    } finally {
      setBuscandoDatajud(false);
    }
  };

  const handleCadastrarProcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/processos/', {
        cnj: somenteDigitos(formProcesso.cnj),
        titulo: formProcesso.titulo,
        tribunal: formProcesso.tribunal,
        tipo_processo: formProcesso.tipo_processo,
        cliente_id: parseInt(formProcesso.cliente_id)
      });

      setAviso({
        tipo: "sucesso",
        texto: "Processo cadastrado e enviado para a piscina!"
      });
      fecharModalProcesso();
      await carregarDados();
    } catch (error) {
      setAviso({
        tipo: "erro",
        texto: mensagemDeErro(error, "Erro ao cadastrar processo.")
      });
    }
  };

  // --- UTILS DE DATA E FORMATOS ---
  // Constrói a data a partir dos componentes Y/M/D em vez de "new Date(str)":
  // uma string "YYYY-MM-DD" é interpretada pelo JS como UTC meia-noite, o que
  // desloca o dia em fusos negativos (Brasil) ao comparar com horário local.
  const parseDataLocal = (dataStr: string) => {
      const [ano, mes, dia] = dataStr.split('T')[0].split('-').map(Number);
      return new Date(ano, mes - 1, dia);
  };

  const analisarPrazo = (dataVencimento?: string) => {
      if (!dataVencimento) return { cor: "#95a5a6", texto: "Sem prazo", dias: null };
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDataLocal(dataVencimento);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDias < 0) return { cor: "#c0392b", texto: "Vencido", dias: diffDias };
      if (diffDias <= 3) return { cor: "#f39c12", texto: `Vence em ${diffDias} dias`, dias: diffDias };
      return { cor: "#27ae60", texto: `Vence em ${diffDias} dias`, dias: diffDias };
  };

  const formatarData = (dataStr: string) => {
      if (!dataStr) return "N/A";
      return new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // --- SUB-COMPONENTES DE RENDERIZAÇÃO ---

  const renderAbaEquipe = () => (
    <div>
      <div style={styles.cabecalhoAba}>
        <h3 style={styles.tituloAba}>Equipe Jurídica (Advogados)</h3>
        <button onClick={() => setModalAdvogadoAberto(true)} style={styles.btnAcaoBase}>
          ➕ Novo Advogado
        </button>
      </div>
      <div style={styles.cardInfo}>
        <table style={styles.tabela}>
          <thead>
            <tr style={styles.tabelaCabecalho}>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>E-mail</th>
              <th style={styles.th}>OAB</th>
            </tr>
          </thead>
          <tbody>
            {advogados.length > 0 ? advogados.map(adv => (
              <tr key={adv.id} style={styles.tabelaLinha}>
                <td style={styles.td}>{adv.nome}</td>
                <td style={styles.td}>{adv.email}</td>
                <td style={styles.td}>{adv.oab || "N/A"}</td>
              </tr>
            )) : (
              <tr><td colSpan={3} style={styles.tdVazio}>Nenhum advogado cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAbaClientes = () => (
    <div>
      <div style={styles.cabecalhoAba}>
        <h3 style={styles.tituloAba}>Carteira de Clientes</h3>
        <button onClick={() => setModalClienteAberto(true)} style={styles.btnAcaoBase}>
          ➕ Novo Cliente
        </button>
      </div>
      <div style={styles.cardInfo}>
        <table style={styles.tabela}>
          <thead>
            <tr style={styles.tabelaCabecalho}>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Documento</th>
              <th style={styles.th}>Contato</th>
              <th style={styles.th}>Processos</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length > 0 ? clientes.map(cliente => {
              const qtdProcessos = processosAdmin.filter(
                (p: any) => p.cliente?.id === cliente.id).length;
              const confirmando = clienteParaExcluir === cliente.id;

              return (
                <tr key={cliente.id} style={styles.tabelaLinha}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "bold" }}>{cliente.nome}</div>
                    <small style={styles.textoSecundario}>
                      {rotuloTipoPessoa(cliente.tipo_pessoa)}
                    </small>
                  </td>
                  <td style={styles.td}>{documentoDoCliente(cliente)}</td>
                  <td style={styles.td}>
                    <div>{cliente.email}</div>
                    <small style={styles.textoSecundario}>
                      {formatarTelefone(cliente.telefone)}
                    </small>
                  </td>
                  <td style={styles.td}>{qtdProcessos}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {confirmando ? (
                      <span style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handleExcluirCliente(cliente.id)}
                          style={styles.btnConfirmarExclusao}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setClienteParaExcluir(null)}
                          style={styles.btnMiniNeutro}
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setClienteParaExcluir(cliente.id)}
                        style={styles.btnMiniNeutro}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} style={styles.tdVazio}>
                  Nenhum cliente cadastrado. Cadastre um cliente antes de abrir
                  um processo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAbaProcessos = () => (
    <div>
      <div style={styles.cabecalhoAba}>
        <h3 style={styles.tituloAba}>Todos os Processos do Escritório</h3>
        <button onClick={() => setModalProcessoAberto(true)} style={styles.btnAcaoBase}>
          ➕ Novo Processo
        </button>
      </div>
      <div style={styles.cardInfo}>
        <table style={styles.tabela}>
          <thead>
            <tr style={styles.tabelaCabecalho}>
              <th style={styles.th}>CNJ</th>
              <th style={styles.th}>Título / Cliente</th>
              <th style={styles.th}>Tribunal / Tipo</th>
              <th style={styles.th}>Responsável / Status</th>
            </tr>
          </thead>
          <tbody>
            {processosAdmin.length > 0 ? processosAdmin.map(proc => (
              <tr key={proc.id} style={styles.tabelaLinha}>
                <td style={{ ...styles.td, fontWeight: "bold" }}>{proc.cnj}</td>
                <td style={styles.td}>
                  <div>{proc.titulo}</div>
                  <small style={styles.textoSecundario}>
                    Cliente: {proc.cliente?.nome || "—"}
                  </small>
                </td>
                <td style={styles.td}>
                  <div>{proc.tribunal}</div>
                  <small style={styles.textoSecundario}>{proc.tipo_processo}</small>
                </td>
                <td style={styles.td}>
                  {proc.responsavel ? (
                    <span style={styles.badgeAtivo}>✅ {proc.responsavel.nome}</span>
                  ) : (
                    <span style={styles.badgePiscina}>⚠️ Aguardando Adoção</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={styles.tdVazio}>Nenhum processo cadastrado neste escritório.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPainelAdmin = () => (
    <div>
      {abaAdmin === "cadastro" && renderAbaEquipe()}
      {abaAdmin === "clientes" && renderAbaClientes()}
      {abaAdmin === "processos" && renderAbaProcessos()}

      {/* MODAL 1: CADASTRO DE ADVOGADO */}
      {modalAdvogadoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTituloDourado}>Cadastrar Advogado</h3>
            <form onSubmit={handleCadastrarAdvogado} style={styles.form}>
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
              <div style={styles.linhaBotoes}>
                <button
                  type="button"
                  onClick={() => {
                    setModalAdvogadoAberto(false);
                    setFormUsuario({ nome: "", email: "", senha: "", oab: "" });
                  }}
                  style={styles.btnCancelar}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.btnSalvar}>Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRO DE CLIENTE */}
      {modalClienteAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTituloAzul}>Cadastrar Cliente</h3>
            <form onSubmit={handleCadastrarCliente} style={styles.form}>
              <div>
                <label style={styles.label}>Tipo de Pessoa</label>
                <select
                  required
                  style={styles.input}
                  value={formCliente.tipo_pessoa}
                  onChange={e => setFormCliente({
                    ...formCliente,
                    tipo_pessoa: e.target.value as TipoPessoa,
                    documento: ""
                  })}
                >
                  <option value="FISICA">Pessoa física</option>
                  <option value="JURIDICA">Pessoa jurídica</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>
                  {formCliente.tipo_pessoa === "FISICA" ? "Nome Completo" : "Razão Social"}
                </label>
                <input required style={styles.input} type="text" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>
                  {formCliente.tipo_pessoa === "FISICA" ? "CPF" : "CNPJ"}
                </label>
                <input
                  required
                  style={styles.input}
                  type="text"
                  placeholder={formCliente.tipo_pessoa === "FISICA"
                    ? "000.000.000-00" : "00.000.000/0000-00"}
                  value={formCliente.documento}
                  onChange={e => setFormCliente({
                    ...formCliente,
                    documento: formCliente.tipo_pessoa === "FISICA"
                      ? formatarCpf(e.target.value)
                      : formatarCnpj(e.target.value)
                  })}
                />
              </div>
              <div>
                <label style={styles.label}>E-mail</label>
                <input required style={styles.input} type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>Telefone</label>
                <input required style={styles.input} type="text" placeholder="(00) 00000-0000" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: formatarTelefone(e.target.value)})} />
              </div>
              <div>
                <label style={styles.label}>Endereço</label>
                <input required style={styles.input} type="text" placeholder="Rua, nº, bairro, cidade/UF" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} />
              </div>
              <div style={styles.linhaBotoes}>
                <button
                  type="button"
                  onClick={() => {
                    setModalClienteAberto(false);
                    setFormCliente(FORM_CLIENTE_VAZIO);
                  }}
                  style={styles.btnCancelar}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.btnSalvar}>Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CADASTRO DE PROCESSO */}
      {modalProcessoAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTituloVermelho}>Cadastrar Novo Processo</h3>
            <form onSubmit={handleCadastrarProcesso} style={styles.form}>
              <div>
                <label style={styles.label}>Cliente</label>
                {clientes.length > 0 ? (
                  <select
                    required
                    style={styles.input}
                    value={formProcesso.cliente_id}
                    onChange={e => setFormProcesso({...formProcesso, cliente_id: e.target.value})}
                  >
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} — {documentoDoCliente(cliente)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={styles.avisoInline}>
                    Nenhum cliente cadastrado ainda. Cadastre o cliente na aba
                    <strong> Clientes </strong> antes de abrir o processo.
                  </div>
                )}
              </div>
              <div>
                <label style={styles.label}>Número CNJ</label>
                <div style={styles.linhaCnj}>
                  <input
                    required
                    placeholder="Apenas números ou formatado"
                    style={{ ...styles.input, flex: 1, minWidth: 0 }}
                    type="text"
                    value={formProcesso.cnj}
                    onChange={e => {
                      setFormProcesso({...formProcesso, cnj: e.target.value});
                      // Resultado de outro número não pode continuar na tela
                      setConsultaDatajud(null);
                      setErroDatajud("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleBuscarDatajud}
                    disabled={somenteDigitos(formProcesso.cnj).length !== 20 || buscandoDatajud}
                    style={{
                      ...styles.btnBuscarDatajud,
                      opacity: somenteDigitos(formProcesso.cnj).length !== 20 || buscandoDatajud ? 0.5 : 1,
                      cursor: somenteDigitos(formProcesso.cnj).length !== 20 || buscandoDatajud ? "not-allowed" : "pointer"
                    }}
                  >
                    {buscandoDatajud ? "Buscando..." : "🔎 Buscar no DataJud"}
                  </button>
                </div>

                {erroDatajud && (
                  <div style={{ ...styles.avisoInline, marginTop: "8px" }}>{erroDatajud}</div>
                )}

                {consultaDatajud && (
                  <div style={styles.caixaDatajud}>
                    <strong>{consultaDatajud.classe ?? "Processo encontrado"}</strong>
                    <div style={styles.textoSecundario}>
                      {[consultaDatajud.orgao_julgador, consultaDatajud.grau].filter(Boolean).join(" · ")}
                    </div>
                    {consultaDatajud.data_ajuizamento && (
                      <div style={styles.textoSecundario}>
                        Ajuizado em {formatarDataSimples(consultaDatajud.data_ajuizamento)}
                      </div>
                    )}

                    <div style={styles.subtituloDatajud}>Últimas movimentações</div>
                    {consultaDatajud.movimentacoes.length > 0 ? (
                      <ul style={styles.listaMovimentacoes}>
                        {consultaDatajud.movimentacoes.map((mov, i) => (
                          <li key={i} style={styles.itemMovimentacao}>
                            <span style={styles.dataMovimentacao}>
                              {formatarDataSimples(mov.data)}{mov.hora ? ` ${mov.hora}` : ""}
                            </span>
                            {mov.nome}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={styles.textoSecundario}>Nenhuma movimentação registrada.</div>
                    )}

                    <small style={styles.notaDatajud}>
                      Fonte: DataJud/CNJ
                      {consultaDatajud.atualizado_em &&
                        `, atualizado em ${new Date(consultaDatajud.atualizado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
                      . O CNJ recebe os dados dos tribunais com atraso: não use estas
                      movimentações para contar prazo.
                    </small>
                  </div>
                )}
              </div>
              <div>
                <label style={styles.label}>Título do Processo</label>
                <input required placeholder="Ex: Ação de Cobrança Indevida" style={styles.input} type="text" value={formProcesso.titulo} onChange={e => setFormProcesso({...formProcesso, titulo: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>Tribunal</label>
                <input required placeholder="Ex: TJCE, TRT7, JF" style={styles.input} type="text" value={formProcesso.tribunal} onChange={e => setFormProcesso({...formProcesso, tribunal: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>Tipo de Processo</label>
                <select required style={styles.input} value={formProcesso.tipo_processo} onChange={e => setFormProcesso({...formProcesso, tipo_processo: e.target.value})}>
                  <option value="">Selecione o tipo...</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Civil">Civil</option>
                  <option value="Trabalhista">Trabalhista</option>
                  <option value="Criminal">Criminal</option>
                </select>
              </div>
              <div style={styles.linhaBotoes}>
                <button
                  type="button"
                  onClick={fecharModalProcesso}
                  style={styles.btnCancelar}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.btnSalvar,
                    backgroundColor: clientes.length > 0 ? "#c0392b" : "#bdc3c7",
                    cursor: clientes.length > 0 ? "pointer" : "not-allowed"
                  }}
                  disabled={clientes.length === 0}
                >
                  Cadastrar Processo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderPainelAdvogado = () => (
    <div style={{ display: "flex", gap: "20px" }}>
      <div style={styles.column}>
        <h3 style={styles.tituloColunaAzul}>📋 Meus Processos Ativos</h3>
        {meusProcessos.length > 0 ? meusProcessos.map((processo) => {
          const dataVencimentoReal = processo.prazos && processo.prazos.length > 0 ? processo.prazos[0].data_vencimento : undefined;
          const infoPrazo = analisarPrazo(dataVencimentoReal);
          return (
            <div key={processo.id} style={{ ...styles.processCard, borderLeft: `6px solid ${infoPrazo.cor}` }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#1a2a3a', fontSize: '1.1rem' }}>{processo.cnj}</h4>
                  <span style={{ ...styles.badgePrazo, backgroundColor: infoPrazo.cor + "20", color: infoPrazo.cor === '#95a5a6' ? '#333' : infoPrazo.cor, border: `1px solid ${infoPrazo.cor}` }}>
                    ⏳ {infoPrazo.texto}
                  </span>
                </div>
                <div style={styles.gridInfo}>
                  <div><span style={styles.label}>Cliente:</span><span style={styles.valor}>{processo.cliente?.nome || "—"}</span></div>
                  <div><span style={styles.label}>Tribunal:</span><span style={styles.valor}>{processo.tribunal}</span></div>
                  <div><span style={styles.label}>Tipo:</span><span style={styles.valor}>{processo.tipo_processo}</span></div>
                  <div><span style={styles.label}>Vencimento:</span><span style={styles.valor}>{dataVencimentoReal ? formatarData(dataVencimentoReal) : "Sem prazo"}</span></div>
                </div>
                <span style={styles.badgeAtivo}>{processo.status}</span>
            </div>
          );
        }) : <p style={{ color: "#666" }}>Nenhum processo sob sua responsabilidade.</p>}
      </div>

      <div style={styles.column}>
        <h3 style={styles.tituloColunaVermelha}>⚠️ Piscina (Aguardando Adoção)</h3>
        {piscinaProcessos.length > 0 ? piscinaProcessos.map((processo) => (
          <div key={processo.id} style={styles.processCardOrphan}>
            <h4 style={{ margin: "0 0 10px 0" }}>{processo.cnj}</h4>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Título:</strong> {processo.titulo}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Cliente:</strong> {processo.cliente?.nome || "—"}</p>
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
            {user?.perfil === "ADMIN" ? (
              <>
                <li onClick={() => setAbaAdmin("cadastro")} style={abaAdmin === "cadastro" ? styles.menuItemAtivo : styles.menuItemInativo}>
                  📝 Equipe
                </li>
                <li onClick={() => setAbaAdmin("clientes")} style={abaAdmin === "clientes" ? styles.menuItemAtivo : styles.menuItemInativo}>
                  👤 Clientes
                </li>
                <li onClick={() => setAbaAdmin("processos")} style={abaAdmin === "processos" ? styles.menuItemAtivo : styles.menuItemInativo}>
                  📂 Processos
                </li>
              </>
            ) : (
              <li style={styles.menuItemAtivo}>📂 Meus Processos</li>
            )}
          </ul>
        </div>
        <button onClick={logout} style={styles.logoutButton}>🚪 Sair do Sistema</button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h3 style={{ margin: 0 }}>Painel Operacional — Gerenciamento</h3>
        </header>

        <section style={{ padding: "30px" }}>
          <div style={styles.cardInfoTop}>
            <h2 style={{ marginTop: 0 }}>Bem-vindo, {user?.nome || user?.email || "Usuário"}!</h2>
            <p style={{ color: "#666", marginBottom: 0 }}>
              Perfil ativo: <strong>{user?.perfil || "Desconhecido"}</strong>
            </p>
          </div>

          {aviso && (
            <div style={aviso.tipo === "sucesso" ? styles.avisoSucesso : styles.avisoErro}>
              <span>{aviso.texto}</span>
              <button onClick={() => setAviso(null)} style={styles.btnFecharAviso}>✕</button>
            </div>
          )}

          {erro && <p style={{ color: "red", fontWeight: "bold" }}>{erro}</p>}

          {carregando ? (
            <p>Carregando painel...</p>
          ) : (
            user?.perfil === "ADMIN" ? renderPainelAdmin() : renderPainelAdvogado()
          )}
        </section>
      </main>
    </div>
  );
}

// --- CONFIGURAÇÃO DE ESTILOS ---
const styles = {
  container: { display: "flex", height: "100vh", width: "100vw", margin: 0, fontFamily: "sans-serif" },
  sidebar: { width: "250px", backgroundColor: "#1a2a3a", color: "white", padding: "20px", display: "flex", flexDirection: "column" as const, boxSizing: "border-box" as const },
  logo: { width: "100px", borderRadius: "8px", objectFit: "cover" as const },
  menuItemAtivo: { cursor: "pointer", borderBottom: "2px solid #D4AF37", paddingBottom: "5px", color: "#D4AF37", fontWeight: "bold" as const, marginBottom: "10px" },
  menuItemInativo: { cursor: "pointer", color: "#a0aab5", paddingBottom: "5px", marginBottom: "10px", transition: "0.2s" },
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
  badgePiscina: { display: "inline-block", backgroundColor: "#fff5f5", color: "#c0392b", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" as const, border: "1px solid #ffdce0" },
  btnAssumir: { marginTop: "10px", backgroundColor: "#c0392b", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const, width: "100%" },
  btnAcaoBase: { backgroundColor: "#1a2a3a", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" as const },
  modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "8px", width: "420px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 4px 15px rgba(0,0,0,0.2)" },
  modalTituloDourado: { marginTop: 0, borderBottom: "2px solid #D4AF37", paddingBottom: "10px" },
  modalTituloAzul: { marginTop: 0, borderBottom: "2px solid #1a2a3a", paddingBottom: "10px" },
  modalTituloVermelho: { marginTop: 0, borderBottom: "2px solid #c0392b", paddingBottom: "10px" },
  form: { display: "flex", flexDirection: "column" as const, gap: "15px" },
  linhaBotoes: { display: "flex", gap: "10px", marginTop: "10px" },
  input: { width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" as const },
  btnCancelar: { flex: 1, padding: "10px", backgroundColor: "#ecf0f1", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const },
  btnSalvar: { flex: 1, padding: "10px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" as const },
  cabecalhoAba: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  tituloAba: { margin: 0, color: "#1a2a3a" },
  tabela: { width: "100%", borderCollapse: "collapse" as const, textAlign: "left" as const },
  tabelaCabecalho: { borderBottom: "2px solid #ddd" },
  tabelaLinha: { borderBottom: "1px solid #eee" },
  th: { padding: "12px" },
  td: { padding: "12px", verticalAlign: "top" as const },
  tdVazio: { padding: "18px 12px", textAlign: "center" as const, color: "#666" },
  textoSecundario: { color: "#777" },
  btnMiniNeutro: { padding: "5px 10px", backgroundColor: "#ecf0f1", color: "#333", border: "1px solid #dfe4e6", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" as const },
  btnConfirmarExclusao: { padding: "5px 10px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" as const },
  avisoSucesso: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c5e3c8", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontWeight: "bold" as const },
  avisoErro: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", backgroundColor: "#fdecea", color: "#c0392b", border: "1px solid #f5c6c2", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontWeight: "bold" as const },
  btnFecharAviso: { background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "16px", lineHeight: 1 },
  linhaCnj: { display: "flex", gap: "8px" },
  btnBuscarDatajud: { padding: "0 12px", backgroundColor: "#1a2a3a", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold" as const, whiteSpace: "nowrap" as const },
  caixaDatajud: { marginTop: "10px", padding: "12px", backgroundColor: "#f4f7fa", border: "1px solid #d6e0ea", borderRadius: "4px", fontSize: "13px", display: "flex", flexDirection: "column" as const, gap: "4px" },
  subtituloDatajud: { marginTop: "8px", fontWeight: "bold" as const, color: "#1a2a3a" },
  listaMovimentacoes: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: "4px" },
  itemMovimentacao: { display: "flex", gap: "8px" },
  dataMovimentacao: { color: "#777", whiteSpace: "nowrap" as const, fontVariantNumeric: "tabular-nums" as const },
  notaDatajud: { marginTop: "8px", color: "#8a6d1a" },
  avisoInline: { backgroundColor: "#fff8e1", border: "1px solid #ffe0a3", color: "#8a6d1a", padding: "10px", borderRadius: "4px", fontSize: "13px" }
};
