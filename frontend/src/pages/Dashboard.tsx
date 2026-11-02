import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import type { Cliente, TipoPessoa } from "../types/cliente";
import type { ConsultaDatajud, ResultadoDjen, Publicacao } from "../types/datajud";
import {
  formatarCpf,
  formatarCnpj,
  formatarTelefone,
  somenteDigitos,
  documentoDoCliente,
  rotuloTipoPessoa,
  formatarDataSimples,
  formatarCnj,
  UFS,
} from "../utils/formatos";

type AbaAdmin = "cadastro" | "clientes" | "processos";
type Aviso = { tipo: "sucesso" | "erro"; texto: string } | null;

// Identidade visual da Spec 007: petróleo, areia e cobre
const CORES = {
  marca: "#1E3D4C",
  marcaTexto: "#F1ECE2",
  marcaSuave: "#B7C6CD",
  fundo: "#F3EFE7",
  papel: "#FFFFFF",
  tinta: "#17242B",
  suave: "#55626A",
  linha: "#DDD6C9",
  detalhe: "#D49A6E",
  detalheTexto: "#A35A2E",
  // Etiquetas de prazo: fundo, texto e a cor da bolinha da legenda do calendário
  vencido: { fundo: "#F4E1DF", texto: "#7E2424", bola: "#B4473F" },
  urgente: { fundo: "#F6E6CF", texto: "#7A420C", bola: "#C27A2C" },
  emdia: { fundo: "#E1EAEE", texto: "#1E3D4C", bola: "#4C7385" },
  neutro: { fundo: "#ECE8E0", texto: "#4A4F53", bola: "#8A8F92" },
};
const FONTE_TITULO = '"EB Garamond", Georgia, serif';

// Certidão de publicação do DJEN, servida pelo CNJ: o link é montado com o hash (Spec 010)
const URL_CERTIDAO_DJEN = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

type Situacao = "vencido" | "urgente" | "emdia" | "neutro";
type AbaAdvogado = "painel" | "calendario" | "processos" | "piscina";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Ícones de traço fino, só decorativos (por isso aria-hidden)
const icone = (desenho: React.ReactNode, tamanho = 18, traco = 1.6) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco} aria-hidden="true" style={{ flexShrink: 0 }}>
    {desenho}
  </svg>
);
const ICONES = {
  painel: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  pasta: <path d="M4 6h6l2 2h8v11H4z" />,
  piscina: <path d="M4 7h16M4 12h16M4 17h10" />,
  equipe: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 5.2a3.3 3.3 0 0 1 0 6.1M18 14.4c2.1.7 3.5 2.5 3.5 5.6" /></>,
  clientes: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="11" r="2.2" /><path d="M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M14 10h4M14 14h4" /></>,
  anterior: <path d="M15 6l-6 6 6 6" />,
  proximo: <path d="M9 6l6 6-6 6" />,
  busca: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  mais: <path d="M12 5v14M5 12h14" />,
};

// Etiqueta de situação do prazo (vencido, urgente, em dia ou neutro)
const estiloEtiqueta = (tipo: Situacao) => ({
  ...styles.etiqueta,
  backgroundColor: CORES[tipo].fundo,
  color: CORES[tipo].texto,
});

// Mesma lista fixa do backend (app/routes/documentos.py) — Spec 003
const TIPOS_DOCUMENTO = ["Petição inicial", "Contestação", "Réplica", "Recurso", "Petição (outras)"];

// Mesmos dias do backend (PRAZOS_POR_TIPO): usados quando o prazo não tem "dias" gravado (Spec 013)
const DIAS_POR_TIPO: { [tipo: string]: number } = { Civil: 15, Criminal: 10, Trabalhista: 8, Administrativo: 30 };

const FORM_CLIENTE_VAZIO = {
  nome: "",
  tipo_pessoa: "FISICA" as TipoPessoa,
  documento: "",
  email: "",
  telefone: "",
  // Endereço em campos separados (Spec 006)
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

// Máscara 00000-000, como as de formatos.ts; o backend guarda só os dígitos
const formatarCep = (valor: string) =>
  somenteDigitos(valor).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

// "Rua, nº, compl — Bairro, Cidade/UF — CEP 00000-000", pulando o que estiver vazio.
// Cliente antigo só tem o texto antigo no logradouro, então aparece só ele
const enderecoDoCliente = (cliente: any) => {
  if (!cliente) return "";
  const rua = [cliente.logradouro, cliente.numero, cliente.complemento].filter(Boolean).join(", ");
  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join("/");
  const bairroCidade = [cliente.bairro, cidadeUf].filter(Boolean).join(", ");
  const cep = cliente.cep ? `CEP ${formatarCep(cliente.cep)}` : "";
  return [rua, bairroCidade, cep].filter(Boolean).join(" — ");
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Estados para o Advogado
  const [meusProcessos, setMeusProcessos] = useState<any[]>([]);
  const [piscinaProcessos, setPiscinaProcessos] = useState<any[]>([]);

  // Modal de prévia do processo da piscina
  const [processoEmPrevia, setProcessoEmPrevia] = useState<any | null>(null);
  const [dataPublicacaoAssumir, setDataPublicacaoAssumir] = useState("");
  // Publicação para a OAB do advogado que deu a data sugerida; null = veio do processo (Spec 014)
  const [publicacaoSugerida, setPublicacaoSugerida] = useState<Publicacao | null>(null);
  const [atualizandoDatajud, setAtualizandoDatajud] = useState(false);
  // Vira true se a consulta ao DataJud passar de 5 s (mostra a frase de apoio)
  const [consultaDemorada, setConsultaDemorada] = useState(false);
  // Erro de "Assumir": aparece no fim da janela, perto do botão do rodapé
  const [erroPrevia, setErroPrevia] = useState("");
  // Erro da consulta ao DataJud na prévia: aparece logo abaixo do botão de consultar
  const [erroConsultaPrevia, setErroConsultaPrevia] = useState("");

  // Tela "Meus Processos": lista e, ao escolher um, o processo completo
  const [abaAdvogado, setAbaAdvogado] = useState<AbaAdvogado>("painel");
  const [processoAberto, setProcessoAberto] = useState<any | null>(null);

  // Cartão Movimentações do processo completo: aba DataJud ou DJEN (Spec 014).
  // publicacoes = null enquanto a aba DJEN não foi carregada
  const [abaMovimentacoes, setAbaMovimentacoes] = useState<"datajud" | "djen">("datajud");
  const [publicacoes, setPublicacoes] = useState<Publicacao[] | null>(null);
  const [erroPublicacoes, setErroPublicacoes] = useState("");
  const [soAsMinhas, setSoAsMinhas] = useState(false);

  // Calendário (Painel e item do menu): primeiro dia do mês que está na tela
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });

  // Meus processos: busca e ordenação são feitas na própria tela
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"vencimento" | "recentes">("vencimento");

  // Estilo inline não tem media query: no celular o menu vai para cima por esta largura
  const [largura, setLargura] = useState(window.innerWidth);
  const celular = largura < 700;
  useEffect(() => {
    const aoRedimensionar = () => setLargura(window.innerWidth);
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  // Peças do processo aberto na prévia ou no processo completo (Spec 003)
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [arquivoDocumento, setArquivoDocumento] = useState<File | null>(null);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState("");
  // "Peça enviada." / "Peça apagada." abaixo da lista; nunca junto com o erro
  const [sucessoDocumento, setSucessoDocumento] = useState("");
  // Confirmação de exclusão na própria linha, como nos clientes
  const [documentoParaApagar, setDocumentoParaApagar] = useState<number | null>(null);
  // Tabela do ADMIN: processo com a lista de peças aberta embaixo da linha
  const [processoPecasAdmin, setProcessoPecasAdmin] = useState<number | null>(null);

  // Estados para o Admin
  const [abaAdmin, setAbaAdmin] = useState<AbaAdmin>("cadastro");
  const [filtroProcessos, setFiltroProcessos] = useState<"todos" | "piscina" | "vencendo">("todos");
  const [advogados, setAdvogados] = useState<any[]>([]);
  const [processosAdmin, setProcessosAdmin] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Modais do Admin
  const [modalAdvogadoAberto, setModalAdvogadoAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  // Erro do "Novo advogado": fica dentro da janela, porque o aviso do topo ficava atrás do fundo escuro
  const [erroAdvogado, setErroAdvogado] = useState("");

  // Confirmação de exclusão feita na própria linha da tabela, para não
  // depender de window.confirm
  const [clienteParaExcluir, setClienteParaExcluir] = useState<number | null>(null);
  const [processoParaExcluir, setProcessoParaExcluir] = useState<number | null>(null);

  // Formulários do Admin
  const [formUsuario, setFormUsuario] = useState({
    nome: "", email: "", senha: "", oab_numero: "", oab_uf: ""
  });
  const [formProcesso, setFormProcesso] = useState({
    cnj: "", titulo: "", tribunal: "", tipo_processo: "", cliente_id: ""
  });
  const [formCliente, setFormCliente] = useState(FORM_CLIENTE_VAZIO);

  // Busca do CEP no cadastro de cliente (Spec 006)
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  // Depois de achar o CEP, o cursor vai para o Número, que o CEP não traz
  const campoNumeroRef = useRef<HTMLInputElement>(null);

  // Consulta ao DataJud dentro do modal de processo
  const [consultaDatajud, setConsultaDatajud] = useState<ConsultaDatajud | null>(null);
  const [buscandoDatajud, setBuscandoDatajud] = useState(false);
  const [erroDatajud, setErroDatajud] = useState("");

  // "Atualizar todos" pelo DJEN (Spec 013): uma linha por processo; null = janela fechada
  const [linhasDjen, setLinhasDjen] = useState<{ processo: any; resultado: ResultadoDjen | "aguardando" }[] | null>(null);
  const [rodandoDjen, setRodandoDjen] = useState(false);
  const [forcarDjen, setForcarDjen] = useState(false);
  // Ref e não estado: o laço precisa ver na hora que a janela foi fechada
  const pararDjenRef = useRef(false);

  // Prazo "A conferir" no cartão Prazos: dias digitados por prazo (id → texto do campo)
  const [diasDigitados, setDiasDigitados] = useState<{ [prazoId: number]: string }>({});
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);
  const [erroPrazo, setErroPrazo] = useState("");

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
        // Processo encerrado não está esperando ninguém assumir
        setPiscinaProcessos(todosProcessos.filter((p: any) => p.responsavel === null && p.status !== "Encerrado"));
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

  // Trocar de tela mantinha a rolagem da anterior e escondia o "Voltar".
  // Depende só do id para não pular para o topo ao atualizar o DataJud
  useEffect(() => {
    document.querySelector("main")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    // Erro do cartão Prazos de um processo não pode aparecer em outro
    setErroPrazo("");
    // Cada processo abre na aba DataJud, sem a lista do DJEN do anterior (Spec 014)
    setAbaMovimentacoes("datajud");
    setPublicacoes(null);
    setErroPublicacoes("");
    setSoAsMinhas(false);
  }, [abaAdvogado, processoAberto?.id]);

  // Carrega as peças do processo aberto (o completo tem prioridade sobre a prévia)
  const idProcessoComPecas = processoAberto?.id ?? processoEmPrevia?.id ?? processoPecasAdmin;
  useEffect(() => {
    setDocumentos([]);
    setErroDocumento("");
    setSucessoDocumento("");
    setDocumentoParaApagar(null);
    if (!idProcessoComPecas) return;
    api.get(`/processos/${idProcessoComPecas}/documentos`)
      .then(({ data }) => setDocumentos(data))
      .catch(error => setErroDocumento(mensagemDeErro(error, "Não foi possível carregar as peças.")));
  }, [idProcessoComPecas]);

  // --- AÇÕES DO ADVOGADO ---
  const abrirPrevia = async (processo: any) => {
    setProcessoEmPrevia(processo);
    // Sugere a publicação achada (DJEN ou DataJud); o advogado confere
    setDataPublicacaoAssumir(processo.data_publicacao ?? "");
    setPublicacaoSugerida(null);
    setErroPrevia("");
    setErroConsultaPrevia("");
    // Se houver publicação guardada para a OAB do advogado, sugere a mais recente
    // dela (a lista vem da mais nova para a mais antiga). Distribuição não abre prazo (Spec 014)
    try {
      const { data } = await api.get<Publicacao[]>(`/processos/${processo.id}/publicacoes`);
      const minha = data.find(pub => pub.para_mim && (pub.tipo || "").toLowerCase() !== "distribuição");
      if (minha) {
        setDataPublicacaoAssumir(minha.data_publicacao);
        setPublicacaoSugerida(minha);
      }
    } catch {
      // Sem a lista, fica a sugestão de antes
    }
  };

  // Aba DJEN do cartão Movimentações: lê o que já está guardado, sem consultar o DJEN (Spec 014)
  const carregarPublicacoes = async (processoId: number) => {
    setErroPublicacoes("");
    try {
      const { data } = await api.get(`/processos/${processoId}/publicacoes`);
      setPublicacoes(data);
    } catch (error) {
      setErroPublicacoes(mensagemDeErro(error, "Não foi possível carregar as publicações."));
    }
  };

  // Depois de 5 s de consulta, mostra a frase "está demorando". O cleanup cancela
  // o timer quando a consulta termina ou o componente sai da tela.
  useEffect(() => {
    if (!atualizandoDatajud) return;
    const timer = setTimeout(() => setConsultaDemorada(true), 5000);
    return () => {
      clearTimeout(timer);
      setConsultaDemorada(false);
    };
  }, [atualizandoDatajud]);

  // Chamada tanto pelo modal quanto pela tela do processo completo
  const handleAtualizarDatajud = async (processo: any) => {
    setAtualizandoDatajud(true);
    setErroPrevia("");
    setErroConsultaPrevia("");
    try {
      const { data } = await api.post(`/processos/${processo.id}/datajud`);
      setPiscinaProcessos(lista => lista.map(p => (p.id === data.id ? data : p)));
      setMeusProcessos(lista => lista.map(p => (p.id === data.id ? data : p)));
      if (processoEmPrevia) abrirPrevia(data);
      if (processoAberto) setProcessoAberto(data);
      // A consulta grava as publicações novas do DJEN: a aba aberta mostra na hora
      if (processoAberto && abaMovimentacoes === "djen") carregarPublicacoes(data.id);
    } catch (error) {
      const texto = mensagemDeErro(error, "Não foi possível consultar o processo.");
      // No modal o aviso geral ficaria escondido atrás do overlay
      if (processoEmPrevia) setErroConsultaPrevia(texto);
      else setAviso({ tipo: "erro", texto });
    } finally {
      setAtualizandoDatajud(false);
    }
  };

  const handleEnviarDocumento = async (processo: any) => {
    if (!tipoDocumento || !arquivoDocumento) {
      setSucessoDocumento("");
      setErroDocumento("Escolha o tipo da peça e o arquivo PDF.");
      return;
    }
    const dados = new FormData();
    dados.append("tipo", tipoDocumento);
    dados.append("arquivo", arquivoDocumento);
    setEnviandoDocumento(true);
    setErroDocumento("");
    setSucessoDocumento("");
    try {
      // A api usa JSON por padrão; aqui o corpo é arquivo
      const { data } = await api.post(`/processos/${processo.id}/documentos`, dados, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setDocumentos(lista => [data, ...lista]);
      setTipoDocumento("");
      setArquivoDocumento(null);
      setSucessoDocumento("Peça enviada.");
    } catch (error) {
      setErroDocumento(mensagemDeErro(error, "Não foi possível enviar a peça."));
    } finally {
      setEnviandoDocumento(false);
    }
  };

  // Baixa com o token do usuário e entrega ao navegador com o nome original
  const handleBaixarDocumento = async (documento: any) => {
    setErroDocumento("");
    setSucessoDocumento("");
    try {
      const { data } = await api.get(`/documentos/${documento.id}/arquivo`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = documento.nome_arquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErroDocumento(mensagemDeErro(error, "Não foi possível baixar a peça."));
    }
  };

  const handleApagarDocumento = async (documentoId: number) => {
    setErroDocumento("");
    setSucessoDocumento("");
    try {
      await api.delete(`/documentos/${documentoId}`);
      setDocumentos(lista => lista.filter(d => d.id !== documentoId));
      setSucessoDocumento("Peça apagada.");
    } catch (error) {
      setErroDocumento(mensagemDeErro(error, "Não foi possível apagar a peça."));
    } finally {
      setDocumentoParaApagar(null);
    }
  };

  const abrirProcessoCompleto = (processo: any) => {
    setProcessoEmPrevia(null);
    setProcessoAberto(processo);
    setAbaAdvogado("processos");
  };

  const handleAssumirProcesso = async () => {
    const processo = processoEmPrevia;

    // Assumir sem data deixaria o processo sem prazo e sem como informar depois
    if (!dataPublicacaoAssumir) {
      setErroPrevia("Informe a data da publicação para assumir.");
      return;
    }

    try {
      await api.patch(`/processos/${processo.id}`, { responsavel_id: user?.id });

      // Prazo só nasce da publicação (Spec 002). Sempre cria um novo: o
      // prazos[0] pode ser um Prazo Inicial antigo, já finalizado
      await api.post('/prazos/', {
        processo_id: processo.id,
        descricao: `Prazo da publicação (${processo.tipo_processo})`,
        data_publicacao: dataPublicacaoAssumir,
        finalizado: false
      });

      setProcessoEmPrevia(null);
      setAviso({ tipo: "sucesso", texto: "Processo assumido!" });
      await carregarDados();
    } catch (error) {
      setErroPrevia(mensagemDeErro(error, "Não foi possível assumir este processo."));
    }
  };

  const handleLiberarProcesso = async (processoId: number) => {
    try {
      await api.post(`/processos/${processoId}/liberar`);
      setAviso({ tipo: "sucesso", texto: "Processo devolvido à piscina." });
      setProcessoAberto(null);
      await carregarDados();
    } catch (error) {
      setAviso({ tipo: "erro", texto: mensagemDeErro(error, "Não foi possível liberar este processo.") });
    }
  };

  // Prazo "A conferir" (Spec 013). Sem situação: só grava os dias e recalcula o vencimento.
  // Confirmar manda os dias junto, para valer o que está no campo
  const handleAtualizarPrazo = async (processo: any, prazo: any, situacao?: "Confirmado" | "Descartado") => {
    const dias = Number(diasDigitados[prazo.id] ?? prazo.dias ?? DIAS_POR_TIPO[processo.tipo_processo]);
    if (situacao !== "Descartado" && !(dias >= 1 && dias <= 365)) {
      setErroPrazo("Informe de 1 a 365 dias.");
      return;
    }
    setSalvandoPrazo(true);
    setErroPrazo("");
    try {
      await api.patch(`/prazos/${prazo.id}`, situacao === "Descartado" ? { situacao } : { dias, ...(situacao && { situacao }) });
      // Busca o processo de novo para a etiqueta, a faixa e o Painel ficarem certos
      const { data } = await api.get(`/processos/${processo.id}`);
      setProcessoAberto(data);
      setMeusProcessos(lista => lista.map(p => (p.id === data.id ? data : p)));
    } catch (error) {
      setErroPrazo(mensagemDeErro(error, "Não foi possível salvar o prazo."));
    } finally {
      setSalvandoPrazo(false);
    }
  };

  // --- ATUALIZAR TODOS PELO DJEN (Spec 013) ---
  // Um processo por vez: mostra o progresso e respeita o limite do DJEN (429).
  // Só consulta as linhas "aguardando", assim o "Tentar de novo" reaproveita a lista
  const rodarDjen = async (linhasIniciais: { processo: any; resultado: ResultadoDjen | "aguardando" }[], forcar: boolean) => {
    pararDjenRef.current = false;
    setRodandoDjen(true);
    let linhas = linhasIniciais;
    setLinhasDjen(linhas);
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].resultado !== "aguardando") continue;
      let resultado: ResultadoDjen = "erro";
      let processo = linhas[i].processo;
      try {
        const { data } = await api.post(`/processos/${processo.id}/djen`, null, { params: { forcar } });
        resultado = data.resultado;
        processo = data.processo;
      } catch (error) {
        // Qualquer falha da rota vira ✖ e a tela segue para o próximo
        console.error("Erro ao atualizar pelo DJEN:", error);
      }
      // Janela fechada no meio: para depois do processo atual
      if (pararDjenRef.current) break;
      linhas = linhas.map((linha, j) => (j === i ? { processo, resultado } : linha));
      setLinhasDjen(linhas);
    }
    setRodandoDjen(false);
    if (pararDjenRef.current) carregarDados();
  };

  // Fechar recarrega a lista; no meio da atualização, quem recarrega é o rodarDjen ao parar
  const fecharJanelaDjen = () => {
    setLinhasDjen(null);
    if (rodandoDjen) pararDjenRef.current = true;
    else carregarDados();
  };

  // --- AÇÕES DO ADMIN ---
  const handleCadastrarAdvogado = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAdvogado("");
    try {
      await api.post('/usuarios/', {
        nome: formUsuario.nome,
        email: formUsuario.email,
        senha: formUsuario.senha,
        // OAB opcional (trainee sem OAB); vazio vai como null (Spec 014)
        oab_numero: formUsuario.oab_numero || null,
        oab_uf: formUsuario.oab_uf || null,
        perfil: "ADVOGADO"
      });

      setAviso({ tipo: "sucesso", texto: "Advogado cadastrado com sucesso!" });
      setModalAdvogadoAberto(false);
      setFormUsuario({ nome: "", email: "", senha: "", oab_numero: "", oab_uf: "" });
      await carregarDados();
    } catch (error) {
      setErroAdvogado(mensagemDeErro(error, "Erro ao cadastrar advogado."));
    }
  };

  // Chamada ao completar os 8 dígitos do CEP. Sobrescreve rua, bairro, cidade e UF,
  // mas não mexe em número e complemento. Tudo continua editável à mão
  const buscarCep = async (cep: string) => {
    setBuscandoCep(true);
    setAvisoCep("");
    try {
      const { data } = await api.get(`/cep/${cep}`);
      // Forma com função: o usuário pode ter digitado no Número durante a busca
      setFormCliente(form => ({
        ...form,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
      }));
      campoNumeroRef.current?.focus();
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAvisoCep("CEP não encontrado. Preencha o endereço à mão.");
      } else {
        setAvisoCep("Não foi possível consultar o CEP agora. Preencha o endereço à mão.");
      }
    } finally {
      setBuscandoCep(false);
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
        cep: somenteDigitos(formCliente.cep),
        logradouro: formCliente.logradouro,
        numero: formCliente.numero,
        complemento: formCliente.complemento || null,
        bairro: formCliente.bairro,
        cidade: formCliente.cidade,
        uf: formCliente.uf,
      });

      setAviso({ tipo: "sucesso", texto: `Cliente "${data.nome}" cadastrado!` });
      setModalClienteAberto(false);
      setFormCliente(FORM_CLIENTE_VAZIO);
      setAvisoCep("");
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

  const handleExcluirProcesso = async (processoId: number) => {
    try {
      await api.delete(`/processos/${processoId}`);
      setAviso({ tipo: "sucesso", texto: "Processo removido." });
      setProcessoParaExcluir(null);
      await carregarDados();
    } catch (error) {
      setProcessoParaExcluir(null);
      setAviso({ tipo: "erro", texto: mensagemDeErro(error, "Erro ao excluir processo.") });
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
      setErroDatajud(mensagemDeErro(error, "Não foi possível consultar o processo."));
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
        cliente_id: parseInt(formProcesso.cliente_id),
        // Guarda o que veio do DataJud para o advogado ver na piscina
        ...(consultaDatajud && {
          classe: consultaDatajud.classe,
          orgao_julgador: consultaDatajud.orgao_julgador,
          grau: consultaDatajud.grau,
          data_ajuizamento: consultaDatajud.data_ajuizamento,
          assuntos: consultaDatajud.assuntos,
          movimentacoes: consultaDatajud.movimentacoes,
          datajud_atualizado_em: consultaDatajud.atualizado_em,
          data_publicacao: consultaDatajud.data_publicacao,
          data_disponibilizacao: consultaDatajud.data_disponibilizacao,
          fonte_publicacao: consultaDatajud.fonte_publicacao,
          tipo_publicacao: consultaDatajud.tipo_publicacao,
          link_publicacao: consultaDatajud.link_publicacao,
          hash_publicacao: consultaDatajud.hash_publicacao,
          peticao_apos_publicacao: consultaDatajud.peticao_apos_publicacao,
          encerrado_em: consultaDatajud.encerrado_em,
        })
      });

      setAviso({
        tipo: "sucesso",
        texto: consultaDatajud?.encerrado_em
          ? "Processo cadastrado como encerrado (não vai para a piscina)."
          : "Processo cadastrado e enviado para a piscina!"
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

  const analisarPrazo = (dataVencimento?: string): { tipo: Situacao; cor: string; texto: string; dias: number | null } => {
      if (!dataVencimento) return { tipo: "neutro", cor: CORES.neutro.texto, texto: "Sem prazo", dias: null };
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDataLocal(dataVencimento);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDias < 0) return { tipo: "vencido", cor: CORES.vencido.texto, texto: `Vencido há ${-diffDias} ${diffDias === -1 ? "dia" : "dias"}`, dias: diffDias };
      if (diffDias === 0) return { tipo: "urgente", cor: CORES.urgente.texto, texto: "Vence hoje", dias: diffDias };
      if (diffDias === 1) return { tipo: "urgente", cor: CORES.urgente.texto, texto: "Vence amanhã", dias: diffDias };
      if (diffDias <= 3) return { tipo: "urgente", cor: CORES.urgente.texto, texto: `Vence em ${diffDias} dias`, dias: diffDias };
      return { tipo: "emdia", cor: CORES.emdia.texto, texto: `Vence em ${diffDias} dias`, dias: diffDias };
  };

  const formatarData = (dataStr: string) => {
      if (!dataStr) return "N/A";
      return new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // Prazo estimado pela publicação no DataJud que já passou: pode ter sido
  // perdido ou já respondido, e o advogado precisa ver isso
  const estimativaVencida = (processo: any) =>
    !!processo.prazo_estimado && analisarPrazo(processo.prazo_estimado).dias! < 0;

  // Depois disso a estimativa vencida só faz ruído: vira "sem prazo em aberto" (Spec 002)
  const DIAS_ALERTA_ESTIMATIVA = 30;
  const estimativaAntiga = (processo: any) =>
    estimativaVencida(processo) && -analisarPrazo(processo.prazo_estimado).dias! > DIAS_ALERTA_ESTIMATIVA;

  // Prazo que ainda conta: o aberto que vence primeiro. Os Prazos Iniciais
  // antigos ficaram finalizados e não entram (Spec 002)
  const prazoAberto = (processo: any) =>
    (processo.prazos ?? [])
      .filter((prazo: any) => !prazo.finalizado)
      .sort((a: any, b: any) => a.data_vencimento.localeCompare(b.data_vencimento))[0];

  // Publicação nova do DJEN que criou prazo e o advogado ainda não conferiu (Spec 013)
  const temPrazoAConferir = (processo: any) =>
    (processo.prazos ?? []).some((prazo: any) => prazo.situacao === "A conferir");

  const renderEtiquetaConferir = () => (
    <span style={{ ...estiloEtiqueta("urgente"), border: `1px solid ${CORES.urgente.bola}` }}>★ Nova publicação: confira o prazo</span>
  );

  // Troca de tela do advogado; fechar o processo aberto evita que as peças dele
  // apareçam na prévia de outro processo
  const irPara = (aba: AbaAdvogado) => {
    setAbaAdvogado(aba);
    setProcessoAberto(null);
  };

  // Prazos em aberto dos meus processos ativos, do mais antigo para o mais novo.
  // Alimentam o resumo, o calendário e os próximos prazos (Spec 007)
  const prazosAbertos = meusProcessos
    .filter(p => p.status !== "Encerrado")
    .flatMap(p => (p.prazos ?? []).filter((prazo: any) => !prazo.finalizado).map((prazo: any) => ({ ...prazo, processo: p })))
    .sort((a: any, b: any) => a.data_vencimento.localeCompare(b.data_vencimento));

  const mudarMes = (quantos: number) =>
    setMesCalendario(mes => new Date(mes.getFullYear(), mes.getMonth() + quantos, 1));

  // Busca sem diferenciar maiúscula nem acento
  const semAcento = (texto: string) =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Etiqueta da piscina: lá só existe a estimativa pela publicação do DataJud (Spec 002)
  const etiquetaDaPiscina = (processo: any): { tipo: Situacao; texto: string } => {
    if (!processo.prazo_estimado) return { tipo: "neutro", texto: "Sem prazo aberto" };
    const info = analisarPrazo(processo.prazo_estimado);
    // Mais de 30 dias vencida: neutra, sem alarme
    if (estimativaAntiga(processo)) {
      return { tipo: "neutro", texto: `Sem prazo em aberto (última publicação em ${formatarData(processo.data_publicacao)})` };
    }
    // Venceu, mas há petição depois da publicação: talvez já respondida
    if (estimativaVencida(processo)) {
      return { tipo: processo.peticao_apos_publicacao ? "urgente" : "vencido", texto: `Vencido há ${-info.dias!} dias (estimado)` };
    }
    return { tipo: info.tipo, texto: `Prazo estimado: ${formatarData(processo.prazo_estimado).slice(0, 5)}` };
  };

  // Situação do prazo de qualquer processo (tabela e filtros do ADMIN)
  const prazoDoProcesso = (processo: any): { tipo: Situacao; texto: string } => {
    if (processo.status === "Encerrado") return { tipo: "neutro", texto: `Encerrado em ${formatarData(processo.encerrado_em)}` };
    if (!processo.responsavel) return etiquetaDaPiscina(processo);
    const vencimento = prazoAberto(processo)?.data_vencimento;
    const info = analisarPrazo(vencimento);
    return { tipo: info.tipo, texto: vencimento ? `${info.texto} · ${formatarData(vencimento).slice(0, 5)}` : info.texto };
  };

  // --- SUB-COMPONENTES DE RENDERIZAÇÃO ---

  // Região de status sempre renderizada: leitor de tela só anuncia mudança numa região que já existe.
  // width 0 + minWidth 100%: o texto quebra na largura do botão em vez de alargar o contêiner,
  // senão a frase longa empurra o botão para outra linha do cabeçalho (flex-wrap)
  const renderStatusDatajud = () => (
    <div role="status" style={{ ...styles.textoSecundario, width: 0, minWidth: "100%" }}>
      {atualizandoDatajud && (consultaDemorada ? "Está demorando mais que o normal. Aguarde." : "Consultando o DataJud...")}
    </div>
  );

  // Encerrado vem do arquivamento definitivo no DataJud (Spec 001)
  const renderSeloStatus = (processo: any) => (
    processo.status === "Encerrado"
      ? <span style={styles.badgeEncerrado}>Encerrado em {formatarData(processo.encerrado_em)}</span>
      : <span style={styles.badgeAtivo}>{processo.status}</span>
  );

  const formatarTamanho = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

  // Peças do processo (Spec 003). Na prévia só a lista; no processo completo,
  // o responsável também baixa, apaga e envia
  const renderPecas = (processo: any, completo: boolean) => {
    const ehResponsavel = processo.responsavel?.id === user?.id;
    const ehAdmin = user?.perfil === "ADMIN";
    // Enviar e apagar: só o responsável. Baixar: o responsável e o ADMIN
    const podeMexer = completo && ehResponsavel;
    const podeBaixar = podeMexer || ehAdmin;
    return (
      <div>
        {documentos.length > 0 ? (
          <ul style={styles.listaLinhas}>
            {documentos.map((documento, i) => (
              <li key={documento.id} style={{ ...styles.itemLinha, ...(i === 0 && styles.primeiraLinha) }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{documento.tipo}</strong>
                  <span style={styles.segundaLinha}>
                    {documento.nome_arquivo} · {documento.paginas} {documento.paginas === 1 ? "página" : "páginas"} · {formatarTamanho(documento.tamanho)}
                  </span>
                  {/* Quando e quem enviou (issue #73); hora de Brasília para 23:50 não virar o dia seguinte */}
                  <span style={styles.segundaLinha}>
                    Enviada em {new Date(documento.enviado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às {new Date(documento.enviado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })} por {documento.enviado_por_nome}
                  </span>
                </div>
                {podeBaixar && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "flex-start" }}>
                    {documentoParaApagar === documento.id ? (
                      <>
                        {/* Deixa claro o que o botão faz antes de apagar (issue #72) */}
                        <span style={{ ...styles.textoSecundario, alignSelf: "center" }}>Apagar esta peça? Não dá para desfazer.</span>
                        <button onClick={() => handleApagarDocumento(documento.id)} style={styles.btnConfirmarExclusao}>Apagar</button>
                        <button onClick={() => setDocumentoParaApagar(null)} style={styles.btnMiniNeutro}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleBaixarDocumento(documento)} style={styles.btnMiniNeutro}>Baixar</button>
                        {podeMexer && (
                          <button onClick={() => setDocumentoParaApagar(documento.id)} style={styles.btnMiniNeutro}>Apagar</button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <div style={styles.textoSecundario}>Nenhuma peça enviada.</div>}

        {!completo && documentos.length > 0 && !ehResponsavel && !ehAdmin && (
          <div style={{ ...styles.textoSecundario, marginTop: "6px", fontSize: "12px" }}>
            O conteúdo das peças abre depois de assumir o processo.
          </div>
        )}

        {podeMexer && (
          <div style={styles.envio}>
            <select aria-label="Tipo da peça" style={{ ...styles.input, width: "auto" }} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}>
              <option value="">Tipo da peça...</option>
              {TIPOS_DOCUMENTO.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {/* key muda a cada envio para limpar o arquivo escolhido */}
            {/* O input nativo fica escondido; o label faz o papel do botão */}
            <label htmlFor="arquivo-peca" style={{ ...styles.btnSecundario, display: "inline-flex", alignItems: "center", boxSizing: "border-box" }}>Escolher PDF</label>
            <input id="arquivo-peca" key={documentos.length} type="file" accept="application/pdf" onChange={e => setArquivoDocumento(e.target.files?.[0] ?? null)} style={styles.soParaLeitor} />
            <span style={styles.textoSecundario}>{arquivoDocumento ? arquivoDocumento.name : "Nenhum arquivo escolhido"}</span>
            <button onClick={() => handleEnviarDocumento(processo)} disabled={enviandoDocumento} style={styles.btnAcaoBase}>
              {enviandoDocumento ? "Enviando..." : "Enviar peça"}
            </button>
            <small style={styles.textoSecundario}>Só PDF, até 10 MB.</small>
          </div>
        )}

        {erroDocumento && <div style={{ ...styles.avisoInline, marginTop: "8px" }}>{erroDocumento}</div>}
        {/* Mesmas cores do avisoSucesso do topo do Painel */}
        {sucessoDocumento && (
          <div style={{ ...styles.avisoInline, marginTop: "8px", backgroundColor: "#e8f5e9", border: "1px solid #c5e3c8", color: "#2e7d32" }}>
            {sucessoDocumento}
          </div>
        )}
      </div>
    );
  };

  // Usada na prévia e na tela do processo completo. Conferir o prazo só no completo
  const renderListaPrazos = (processo: any, completo: boolean) => {
    // "A conferir" sobe para o topo, em destaque (Spec 013)
    const prazos = [...(processo.prazos ?? [])].sort((a: any, b: any) =>
      (b.situacao === "A conferir" ? 1 : 0) - (a.situacao === "A conferir" ? 1 : 0));
    const padraoDias = DIAS_POR_TIPO[processo.tipo_processo];
    // Criminal conta em dias corridos (Spec 002)
    const rotuloDias = processo.tipo_processo === "Criminal" ? "Dias corridos" : "Dias úteis";
    // Só o responsável confere; o ADMIN não chega ao processo completo
    const podeConferir = completo && processo.responsavel?.id === user?.id;
    return prazos.length > 0 ? (
      <ul style={styles.listaLinhas}>
        {prazos.map((prazo: any, i: number) => {
          const infoPrazo = analisarPrazo(prazo.data_vencimento);
          const verbo = infoPrazo.dias! < 0 ? "venceu" : "vence";

          // Descartado: fica no histórico, em cinza e riscado
          if (prazo.situacao === "Descartado") {
            return (
              <li key={prazo.id} style={{ ...styles.itemLinha, ...(i === 0 && styles.primeiraLinha), color: CORES.suave }}>
                <span style={{ minWidth: 0, textDecoration: "line-through" }}>Descartado: publicação de {formatarData(prazo.data_publicacao)}</span>
                <span style={estiloEtiqueta("neutro")}>Descartado</span>
              </li>
            );
          }

          if (prazo.situacao === "A conferir") {
            return (
              <li key={prazo.id} style={{ ...styles.itemLinha, ...(i === 0 && styles.primeiraLinha), display: "block" }}>
                <div style={styles.caixaConferir}>
                  {renderEtiquetaConferir()}
                  <strong style={{ display: "block", marginTop: "8px" }}>{prazo.descricao}</strong>
                  {/* Links do DJEN: o processo guarda só a última publicação, que é a deste prazo */}
                  {processo.data_publicacao === prazo.data_publicacao && (
                    <span style={{ ...styles.segundaLinha, overflowWrap: "anywhere" }}>{renderPublicacao(processo)}</span>
                  )}
                  <span style={styles.segundaLinha}>
                    {prazo.dias ?? padraoDias} {rotuloDias.toLowerCase()} · {verbo} {formatarData(prazo.data_vencimento)} ({infoPrazo.texto.toLowerCase()})
                  </span>

                  {podeConferir && (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                        <label htmlFor={`dias-${prazo.id}`} style={{ ...styles.label, marginBottom: 0 }}>{rotuloDias}</label>
                        <input
                          id={`dias-${prazo.id}`}
                          type="number"
                          min={1}
                          max={365}
                          style={{ ...styles.input, width: "90px" }}
                          value={diasDigitados[prazo.id] ?? String(prazo.dias ?? padraoDias)}
                          onChange={e => setDiasDigitados({ ...diasDigitados, [prazo.id]: e.target.value })}
                        />
                        <button type="button" onClick={() => handleAtualizarPrazo(processo, prazo)} disabled={salvandoPrazo} style={styles.btnMiniNeutro}>
                          Recalcular vencimento
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                        <button type="button" onClick={() => handleAtualizarPrazo(processo, prazo, "Confirmado")} disabled={salvandoPrazo} style={styles.btnAcaoBase}>
                          Confirmar prazo
                        </button>
                        <button type="button" onClick={() => handleAtualizarPrazo(processo, prazo, "Descartado")} disabled={salvandoPrazo} style={styles.btnSecundario}>
                          Descartar (não gera prazo)
                        </button>
                      </div>
                      {erroPrazo && <div style={{ ...styles.avisoInline, marginTop: "8px" }}>{erroPrazo}</div>}
                    </>
                  )}
                </div>
              </li>
            );
          }

          return (
            <li key={prazo.id} style={{ ...styles.itemLinha, ...(i === 0 && styles.primeiraLinha) }}>
              <div style={{ minWidth: 0 }}>
                <strong>{prazo.descricao}</strong>
                <span style={styles.segundaLinha}>
                  {prazo.interno
                    ? `Prazo inicial antigo (contava do cadastro) · ${verbo} ${formatarData(prazo.data_vencimento)}`
                    : `Publicação ${formatarData(prazo.data_publicacao)} · ${verbo} ${formatarData(prazo.data_vencimento)}`}
                </span>
              </div>
              <span style={estiloEtiqueta(prazo.finalizado ? "neutro" : infoPrazo.tipo)}>
                {prazo.finalizado ? "Finalizado" : infoPrazo.texto}
              </span>
            </li>
          );
        })}
      </ul>
    ) : <div style={styles.textoSecundario}>Nenhum prazo cadastrado.</div>;
  };

  // Linha da publicação com os links do DJEN; usada no cadastro, na prévia e na tela completa
  // Ex.: "Intimação, disponibilizada em 09/10/2026 e publicada em 13/10/2026 (fonte: DJEN) · ver documento"
  const renderPublicacao = (dados: Pick<ConsultaDatajud,
    "data_publicacao" | "data_disponibilizacao" | "tipo_publicacao" | "fonte_publicacao" | "link_publicacao" | "hash_publicacao">) => {
    if (!dados.data_publicacao) return null;
    return (
      <>
        {dados.tipo_publicacao && `${dados.tipo_publicacao}, `}
        {dados.data_disponibilizacao && `disponibilizada em ${formatarData(dados.data_disponibilizacao)} e `}
        publicada em {formatarData(dados.data_publicacao)}
        {dados.fonte_publicacao && ` (fonte: ${dados.fonte_publicacao})`}
        {/* Cada link só aparece se o campo existir; abrem em nova aba */}
        {dados.link_publicacao && (
          <> · <a href={dados.link_publicacao} target="_blank" rel="noopener noreferrer" style={styles.linkPublicacao}>ver documento</a></>
        )}
        {dados.hash_publicacao && (
          <> · <a href={`${URL_CERTIDAO_DJEN}/${dados.hash_publicacao}/certidao`} target="_blank" rel="noopener noreferrer" style={styles.linkPublicacao}>certidão (PDF)</a></>
        )}
      </>
    );
  };

  // Usada no cadastro (consulta na hora) e na prévia da piscina (dados salvos)
  const renderCaixaDatajud = (dados: Pick<ConsultaDatajud,
    "classe" | "orgao_julgador" | "grau" | "data_ajuizamento" | "assuntos" | "movimentacoes" | "atualizado_em" | "encerrado_em">) => (
    <div style={styles.caixaDatajud}>
      <strong>{dados.classe ?? "Processo encontrado"}</strong>
      {dados.encerrado_em && (
        <div style={{ margin: "4px 0" }}>
          <span style={styles.badgeEncerrado}>Encerrado em {formatarData(dados.encerrado_em)}</span>
        </div>
      )}
      <div style={styles.textoSecundario}>
        {[dados.orgao_julgador, dados.grau].filter(Boolean).join(" · ")}
      </div>
      {dados.data_ajuizamento && (
        <div style={styles.textoSecundario}>
          Ajuizado em {formatarDataSimples(dados.data_ajuizamento)}
        </div>
      )}
      {dados.assuntos?.length > 0 && (
        <div style={styles.textoSecundario}>Assuntos: {dados.assuntos.join(", ")}</div>
      )}

      <div style={styles.subtituloDatajud}>Últimas movimentações</div>
      {dados.movimentacoes.length > 0 ? (
        <ul style={styles.listaMovimentacoes}>
          {dados.movimentacoes.slice(0, 5).map((mov, i) => (
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
        {dados.atualizado_em &&
          `, atualizado em ${new Date(dados.atualizado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
        . O CNJ recebe os dados dos tribunais com atraso: não use estas
        movimentações para contar prazo.
      </small>
    </div>
  );

  const renderAbaEquipe = () => (
    <div style={styles.conteudo}>
      {renderTopo(
        "Equipe jurídica",
        `${advogados.length} ${advogados.length === 1 ? "advogado" : "advogados"} no escritório`,
        <button onClick={() => setModalAdvogadoAberto(true)} style={styles.btnAcaoBase}>{icone(ICONES.mais, 16, 2)}Novo advogado</button>
      )}

      <section style={styles.cartaoTabela} aria-label="Advogados">
        <table style={{ ...styles.tabela, minWidth: "640px" }}>
          <thead>
            <tr style={styles.tabelaCabecalho}>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>E-mail</th>
              <th style={styles.th}>OAB</th>
              <th style={styles.th}>Processos</th>
            </tr>
          </thead>
          <tbody>
            {advogados.length > 0 ? advogados.map(adv => {
              // Iniciais: primeira letra do primeiro e do último nome
              const partes = adv.nome.split(" ").filter(Boolean);
              const iniciais = (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
              return (
                <tr key={adv.id} style={styles.tabelaLinha}>
                  <td style={styles.td}>
                    <div style={styles.pessoa}>
                      <span style={styles.inicial} aria-hidden="true">{iniciais}</span>
                      {adv.nome}
                    </div>
                  </td>
                  <td style={styles.td}>{adv.email}</td>
                  <td style={{ ...styles.td, fontVariantNumeric: "tabular-nums" }}>{adv.oab_numero ? `${adv.oab_numero}/${adv.oab_uf}` : "—"}</td>
                  <td style={{ ...styles.td, fontVariantNumeric: "tabular-nums" }}>
                    {processosAdmin.filter((p: any) => p.responsavel?.id === adv.id).length}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} style={styles.tdVazio}>Nenhum advogado cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderAbaClientes = () => (
    <div style={styles.conteudo}>
      {renderTopo(
        "Clientes",
        `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"} na carteira`,
        <button onClick={() => setModalClienteAberto(true)} style={styles.btnAcaoBase}>{icone(ICONES.mais, 16, 2)}Novo cliente</button>
      )}

      <section style={styles.cartaoTabela} aria-label="Carteira de clientes">
        <table style={{ ...styles.tabela, minWidth: "560px" }}>
          <thead>
            <tr style={styles.tabelaCabecalho}>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Contato</th>
              <th style={styles.th}>Processos</th>
              <th style={styles.th}><span style={styles.soParaLeitor}>Ações</span></th>
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
                    {cliente.nome}
                    <span style={{ ...styles.segundaLinha, fontVariantNumeric: "tabular-nums" }}>
                      {cliente.cpf ? "CPF" : "CNPJ"} {documentoDoCliente(cliente)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {formatarTelefone(cliente.telefone)}
                    <span style={styles.segundaLinha}>{cliente.email}</span>
                    <span style={styles.segundaLinha}>
                      {[cliente.cidade, cliente.uf].filter(Boolean).join("/") || "—"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontVariantNumeric: "tabular-nums" }}>{qtdProcessos}</td>
                  <td style={styles.tdAcoes}>
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
                <td colSpan={4} style={styles.tdVazio}>
                  Nenhum cliente cadastrado. Cadastre um cliente antes de abrir
                  um processo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderAbaProcessos = () => {
    const naPiscina = processosAdmin.filter((p: any) => !p.responsavel && p.status !== "Encerrado").length;
    // Filtros: todos, só a piscina, ou o prazo que já venceu / vence em até 3 dias
    const visiveis = processosAdmin.filter((p: any) => {
      if (filtroProcessos === "piscina") return !p.responsavel && p.status !== "Encerrado";
      if (filtroProcessos === "vencendo") return ["vencido", "urgente"].includes(prazoDoProcesso(p).tipo);
      return true;
    });
    const filtros = [
      { chave: "todos", rotulo: "Todos" },
      { chave: "piscina", rotulo: "Na piscina" },
      { chave: "vencendo", rotulo: "Com prazo vencendo" },
    ] as const;

    return (
      <div style={styles.conteudo}>
        {renderTopo(
          "Processos do escritório",
          `${processosAdmin.length} ${processosAdmin.length === 1 ? "processo" : "processos"} · ${naPiscina} aguardando advogado na piscina`,
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
            {renderAtualizarTodos(processosAdmin)}
            <button onClick={() => setModalProcessoAberto(true)} style={styles.btnAcaoBase}>{icone(ICONES.mais, 16, 2)}Novo processo</button>
          </div>
        )}

        <div style={{ ...styles.abasOrdem, alignSelf: "flex-start", flexWrap: "wrap" }} role="group" aria-label="Filtrar">
          {filtros.map(filtro => (
            <button
              key={filtro.chave}
              type="button"
              aria-pressed={filtroProcessos === filtro.chave}
              onClick={() => setFiltroProcessos(filtro.chave)}
              style={filtroProcessos === filtro.chave ? styles.abaOrdemAtiva : styles.abaOrdem}
            >
              {filtro.rotulo}
            </button>
          ))}
        </div>

        <section style={styles.cartaoTabela} aria-label="Processos">
          <table style={{ ...styles.tabela, minWidth: "900px" }}>
            <thead>
              <tr style={styles.tabelaCabecalho}>
                <th style={styles.th}>Processo</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Tribunal</th>
                <th style={styles.th}>Responsável</th>
                <th style={styles.th}>Prazo</th>
                <th style={styles.th}><span style={styles.soParaLeitor}>Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.length > 0 ? visiveis.map(proc => {
                const confirmando = processoParaExcluir === proc.id;
                const prazoProc = prazoDoProcesso(proc);
                return (
                  <React.Fragment key={proc.id}>
                    <tr style={styles.tabelaLinha}>
                      <td style={styles.td}>
                        <span style={styles.cnjTabela}>{formatarCnj(proc.cnj)}</span>
                        <span style={styles.segundaLinha}>{proc.titulo}</span>
                      </td>
                      <td style={styles.td}>{proc.cliente?.nome || "—"}</td>
                      <td style={styles.td}>
                        {proc.tribunal}
                        <span style={styles.segundaLinha}>{proc.tipo_processo}</span>
                      </td>
                      <td style={styles.td}>
                        {proc.responsavel ? proc.responsavel.nome : (
                          <span style={{ ...estiloEtiqueta("urgente"), backgroundColor: CORES.papel, border: `1px dashed ${CORES.urgente.bola}` }}>Na piscina</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={estiloEtiqueta(prazoProc.tipo)}>{prazoProc.texto}</span>
                        {temPrazoAConferir(proc) && <div style={{ marginTop: "6px" }}>{renderEtiquetaConferir()}</div>}
                      </td>
                      <td style={styles.tdAcoes}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setProcessoPecasAdmin(processoPecasAdmin === proc.id ? null : proc.id)}
                            style={styles.btnMiniNeutro}
                          >
                            {processoPecasAdmin === proc.id ? "Fechar" : "Peças"}
                          </button>
                          {!proc.responsavel && (
                            confirmando ? (
                              <>
                                <button onClick={() => handleExcluirProcesso(proc.id)} style={styles.btnConfirmarExclusao}>
                                  Confirmar
                                </button>
                                <button onClick={() => setProcessoParaExcluir(null)} style={styles.btnMiniNeutro}>
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button onClick={() => setProcessoParaExcluir(proc.id)} style={styles.btnMiniNeutro}>
                                Excluir
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Peças do processo abertas embaixo da linha (Spec 003) */}
                    {processoPecasAdmin === proc.id && (
                      <tr>
                        <td colSpan={6} style={{ ...styles.td, backgroundColor: "#FAF8F3" }}>
                          {renderPecas(proc, false)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan={6} style={styles.tdVazio}>
                  {processosAdmin.length > 0 ? "Nenhum processo neste filtro." : "Nenhum processo cadastrado neste escritório."}
                </td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    );
  };

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
                <label htmlFor="campo-1" style={styles.label}>Nome Completo</label>
                <input id="campo-1" required style={styles.input} type="text" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-2" style={styles.label}>E-mail</label>
                <input id="campo-2" required style={styles.input} type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-3" style={styles.label}>Senha de Acesso</label>
                <input id="campo-3" required style={styles.input} type="password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} />
              </div>
              {/* OAB opcional, em número (só dígitos) e UF, como o DJEN manda (Spec 014) */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="campo-4" style={styles.label}>Número da OAB (opcional)</label>
                  <input id="campo-4" style={styles.input} type="text" inputMode="numeric" placeholder="Ex: 123456" value={formUsuario.oab_numero} onChange={e => setFormUsuario({...formUsuario, oab_numero: somenteDigitos(e.target.value)})} />
                </div>
                <div style={{ width: "96px" }}>
                  <label htmlFor="campo-4-uf" style={styles.label}>UF</label>
                  <select id="campo-4-uf" style={styles.input} value={formUsuario.oab_uf} onChange={e => setFormUsuario({...formUsuario, oab_uf: e.target.value})}>
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              {erroAdvogado && <div role="alert" style={{ ...styles.avisoErro, marginBottom: 0 }}>{erroAdvogado}</div>}
              <div style={styles.linhaBotoes}>
                <button
                  type="button"
                  onClick={() => {
                    setModalAdvogadoAberto(false);
                    setFormUsuario({ nome: "", email: "", senha: "", oab_numero: "", oab_uf: "" });
                    setErroAdvogado("");
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
                <label htmlFor="campo-5" style={styles.label}>Tipo de Pessoa</label>
                <select id="campo-5"
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
                <label htmlFor="campo-6" style={styles.label}>
                  {formCliente.tipo_pessoa === "FISICA" ? "Nome Completo" : "Razão Social"}
                </label>
                <input id="campo-6" required style={styles.input} type="text" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-7" style={styles.label}>
                  {formCliente.tipo_pessoa === "FISICA" ? "CPF" : "CNPJ"}
                </label>
                <input id="campo-7"
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
                <label htmlFor="campo-8" style={styles.label}>E-mail</label>
                <input id="campo-8" required style={styles.input} type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-9" style={styles.label}>Telefone</label>
                <input id="campo-9" required style={styles.input} type="text" placeholder="(00) 00000-0000" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: formatarTelefone(e.target.value)})} />
              </div>
              <div style={styles.secao}>Endereço</div>
              <div>
                <label htmlFor="campo-10" style={styles.label}>CEP</label>
                <input id="campo-10"
                  required
                  style={styles.input}
                  type="text"
                  placeholder="00000-000"
                  value={formCliente.cep}
                  onChange={e => {
                    const cep = formatarCep(e.target.value);
                    setFormCliente({...formCliente, cep});
                    setAvisoCep("");
                    // Busca sozinha quando o CEP fica completo (e só se ele mudou)
                    const digitosCep = somenteDigitos(cep);
                    if (digitosCep.length === 8 && digitosCep !== somenteDigitos(formCliente.cep)) buscarCep(digitosCep);
                  }}
                />
                {buscandoCep && <small style={styles.textoSecundario}>Buscando CEP...</small>}
                {avisoCep && <div style={{ ...styles.avisoInline, marginTop: "4px" }}>{avisoCep}</div>}
              </div>
              <div>
                <label htmlFor="campo-11" style={styles.label}>Rua</label>
                <input id="campo-11" required style={styles.input} type="text" value={formCliente.logradouro} onChange={e => setFormCliente({...formCliente, logradouro: e.target.value})} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="campo-12" style={styles.label}>Número</label>
                  <input id="campo-12" required ref={campoNumeroRef} style={styles.input} type="text" placeholder="123 ou s/n" value={formCliente.numero} onChange={e => setFormCliente({...formCliente, numero: e.target.value})} />
                </div>
                <div style={{ flex: 2 }}>
                  <label htmlFor="campo-13" style={styles.label}>Complemento (opcional)</label>
                  <input id="campo-13" style={styles.input} type="text" placeholder="Apto, bloco, sala..." value={formCliente.complemento} onChange={e => setFormCliente({...formCliente, complemento: e.target.value})} />
                </div>
              </div>
              <div>
                <label htmlFor="campo-14" style={styles.label}>Bairro</label>
                <input id="campo-14" required style={styles.input} type="text" value={formCliente.bairro} onChange={e => setFormCliente({...formCliente, bairro: e.target.value})} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 3 }}>
                  <label htmlFor="campo-15" style={styles.label}>Cidade</label>
                  <input id="campo-15" required style={styles.input} type="text" value={formCliente.cidade} onChange={e => setFormCliente({...formCliente, cidade: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="campo-16" style={styles.label}>UF</label>
                  <input id="campo-16" required style={styles.input} type="text" maxLength={2} placeholder="CE" value={formCliente.uf} onChange={e => setFormCliente({...formCliente, uf: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div style={styles.linhaBotoes}>
                <button
                  type="button"
                  onClick={() => {
                    setModalClienteAberto(false);
                    setFormCliente(FORM_CLIENTE_VAZIO);
                    setAvisoCep("");
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
                <label htmlFor="campo-cliente" style={styles.label}>Cliente</label>
                {clientes.length > 0 ? (
                  <select
                    id="campo-cliente"
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
                <label htmlFor="campo-cnj" style={styles.label}>Número CNJ</label>
                <div style={styles.linhaCnj}>
                  <input
                    id="campo-cnj"
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
                    {buscandoDatajud ? "Buscando..." : "Buscar processo"}
                  </button>
                </div>

                {erroDatajud && (
                  <div style={{ ...styles.avisoInline, marginTop: "8px" }}>{erroDatajud}</div>
                )}

                {consultaDatajud && renderCaixaDatajud(consultaDatajud)}
                {/* Fora da caixa porque a prévia também usa a caixa e já mostra a publicação */}
                {consultaDatajud?.data_publicacao && (
                  <div style={{ ...styles.textoSecundario, marginTop: "8px", overflowWrap: "anywhere" }}>
                    Pela publicação: {renderPublicacao(consultaDatajud)}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="campo-17" style={styles.label}>Título do Processo</label>
                <input id="campo-17" required placeholder="Ex: Ação de Cobrança Indevida" style={styles.input} type="text" value={formProcesso.titulo} onChange={e => setFormProcesso({...formProcesso, titulo: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-18" style={styles.label}>Tribunal</label>
                <input id="campo-18" required placeholder="Ex: TJCE, TRT7, JF" style={styles.input} type="text" value={formProcesso.tribunal} onChange={e => setFormProcesso({...formProcesso, tribunal: e.target.value})} />
              </div>
              <div>
                <label htmlFor="campo-19" style={styles.label}>Tipo de Processo</label>
                <select id="campo-19" required style={styles.input} value={formProcesso.tipo_processo} onChange={e => setFormProcesso({...formProcesso, tipo_processo: e.target.value})}>
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
                    backgroundColor: clientes.length > 0 && consultaDatajud ? CORES.marca : CORES.neutro.fundo,
                    color: clientes.length > 0 && consultaDatajud ? CORES.marcaTexto : CORES.neutro.texto,
                    cursor: clientes.length > 0 && consultaDatajud ? "pointer" : "not-allowed"
                  }}
                  // Só entra processo que o DataJud achou (Spec 001). Mudar o
                  // CNJ apaga a consulta, então trava de novo
                  disabled={clientes.length === 0 || !consultaDatajud}
                  title={!consultaDatajud ? "Busque o processo antes de cadastrar" : undefined}
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

  // Um dado do cartão: rótulo pequeno em cima, valor embaixo
  const renderDado = (rotulo: string, valor: React.ReactNode, largo = false) => (
    <div style={largo ? { gridColumn: "1 / -1", minWidth: 0 } : { minWidth: 0 }}>
      <dt style={styles.dt}>{rotulo}</dt>
      <dd style={styles.dd}>{valor || "—"}</dd>
    </div>
  );

  // Aba DJEN do cartão Movimentações (Spec 014): publicações guardadas, da mais nova para a mais antiga
  const renderPublicacoesDjen = () => {
    const temOab = Boolean(user?.oab_numero);
    const lista = (publicacoes ?? []).filter(pub => !soAsMinhas || pub.para_mim);
    return (
      <>
        {/* Sem OAB não há com o que comparar: a caixa fica travada e diz o porquê */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", cursor: temOab ? "pointer" : "not-allowed", color: temOab ? CORES.tinta : CORES.suave }}>
          <input type="checkbox" checked={soAsMinhas} disabled={!temOab} onChange={e => setSoAsMinhas(e.target.checked)} style={{ width: "18px", height: "18px" }} />
          Só as minhas
          {!temOab && <span style={{ fontSize: "13px" }}>· Cadastre sua OAB para filtrar</span>}
        </label>
        {erroPublicacoes ? (
          <div role="alert" style={{ ...styles.avisoInline, backgroundColor: CORES.vencido.fundo, color: CORES.vencido.texto, borderColor: "#E3C2BE" }}>{erroPublicacoes}</div>
        ) : publicacoes === null ? (
          <div style={styles.textoSecundario}>Carregando publicações...</div>
        ) : publicacoes.length === 0 ? (
          <div style={styles.avisoInline}>Nenhuma publicação guardada. Clique em Atualizar processo para buscar no DJEN.</div>
        ) : lista.length === 0 ? (
          <div style={styles.textoSecundario}>Nenhuma publicação dirigida à sua OAB.</div>
        ) : (
          <ol style={{ ...styles.linhaTempo, marginTop: "12px" }}>
            {lista.map(pub => (
              <li key={pub.id} style={styles.itemTempo}>
                <span style={styles.pontoTempo} aria-hidden="true" />
                <time style={styles.dataTempo}>{formatarDataSimples(pub.data_disponibilizacao)}</time>
                {pub.para_mim && <span style={{ ...estiloEtiqueta("emdia"), marginLeft: "8px" }}>sua</span>}
                <div>
                  {pub.tipo || "Comunicação"}
                  {(pub.tipo || "").toLowerCase() === "distribuição" && <span style={styles.textoSecundario}> (não abre prazo)</span>}
                </div>
                <div style={{ ...styles.textoSecundario, fontSize: "14px" }}>
                  {pub.orgao}
                  {pub.link && (
                    <>{pub.orgao && " · "}<a href={pub.link} target="_blank" rel="noopener noreferrer" style={styles.linkPublicacao}>ver documento</a></>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </>
    );
  };

  const renderProcessoCompleto = (processo: any) => {
    const prazo = prazoAberto(processo);
    const infoPrazo = analisarPrazo(prazo?.data_vencimento);
    const corFaixa = processo.status === "Encerrado" ? CORES.neutro : CORES[infoPrazo.tipo];
    const cliente = processo.cliente;
    const colunasDados = celular ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))";

    return (
      <div style={styles.conteudo}>
        <nav aria-label="Você está em" style={styles.trilha}>
          <button type="button" onClick={() => setProcessoAberto(null)} style={styles.linkTrilha}>Meus processos</button>
          <span aria-hidden="true">/</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatarCnj(processo.cnj) || "—"}</span>
        </nav>

        <header style={{ ...styles.topo, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...styles.tituloPagina, fontSize: "36px", lineHeight: 1.1 }}>{processo.titulo}</h1>
            <div style={styles.cnjGrande}>{[formatarCnj(processo.cnj), processo.tribunal, processo.grau].filter(Boolean).join(" · ")}</div>
            {processo.status === "Encerrado" && <div style={{ marginTop: "8px" }}>{renderSeloStatus(processo)}</div>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-start" }}>
            <button type="button" onClick={() => handleLiberarProcesso(processo.id)} style={styles.btnSecundario}>Liberar para a piscina</button>
            {processo.cnj && (
              <div>
                <button
                  type="button"
                  onClick={() => handleAtualizarDatajud(processo)}
                  disabled={atualizandoDatajud}
                  aria-busy={atualizandoDatajud}
                  style={atualizandoDatajud ? { ...styles.btnAcaoBase, opacity: 0.7, cursor: "wait" } : styles.btnAcaoBase}
                >
                  {atualizandoDatajud && <span className="spinner" aria-hidden="true" />}
                  {atualizandoDatajud ? "Consultando..." : processo.movimentacoes ? "Atualizar processo" : "Buscar processo"}
                </button>
                {renderStatusDatajud()}
              </div>
            )}
          </div>
        </header>

        {/* Prazo em aberto mais próximo e a publicação de onde ele conta */}
        <div role="status" style={{ ...styles.faixa, backgroundColor: corFaixa.fundo, color: corFaixa.texto, border: `1px solid ${corFaixa.texto}40` }}>
          {prazo && processo.status !== "Encerrado" ? (
            <>
              <strong style={{ fontSize: "18px" }}>Prazo {infoPrazo.texto.toLowerCase()}, {formatarData(prazo.data_vencimento)}</strong>
              <span>{prazo.interno ? "Prazo inicial antigo (contava do cadastro)" : `Publicação de ${formatarData(prazo.data_publicacao)}`}</span>
            </>
          ) : (
            <strong style={{ fontSize: "18px" }}>
              {processo.status === "Encerrado" ? `Processo encerrado em ${formatarData(processo.encerrado_em)}` : "Sem prazo em aberto"}
            </strong>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: largura < 900 ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", gap: "24px" }}>
          <section style={styles.cartao} aria-label="Dados do processo">
            <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Dados do processo</h2></div>
            <dl style={{ ...styles.dl, gridTemplateColumns: colunasDados }}>
              {renderDado("Tipo", processo.tipo_processo)}
              {renderDado("Classe", processo.classe)}
              {renderDado("Ajuizado em", processo.data_ajuizamento ? formatarDataSimples(processo.data_ajuizamento) : "")}
              {/* data_cadastro vem em UTC sem fuso; o "Z" evita mostrar o dia seguinte depois das 21h */}
              {renderDado("Cadastrado em", `${new Date(processo.data_cadastro + "Z").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} por ${processo.criador?.nome}`)}
              {renderDado("Órgão julgador", processo.orgao_julgador, true)}
              {renderDado("Assuntos", processo.assuntos?.length > 0 ? processo.assuntos.join(", ") : "", true)}
              {renderDado("Última publicação", renderPublicacao(processo), true)}
            </dl>
          </section>

          <section style={styles.cartao} aria-label="Cliente">
            <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Cliente</h2></div>
            <dl style={{ ...styles.dl, gridTemplateColumns: colunasDados }}>
              {renderDado("Nome", cliente?.nome, true)}
              {renderDado("Documento", cliente ? `${cliente.cpf ? "CPF" : "CNPJ"} ${documentoDoCliente(cliente)}` : "")}
              {renderDado("Telefone", formatarTelefone(cliente?.telefone || ""))}
              {renderDado("E-mail", cliente?.email, true)}
              {renderDado("Endereço", enderecoDoCliente(cliente), true)}
            </dl>
          </section>

          <section style={styles.cartao} aria-label="Prazos">
            <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Prazos</h2></div>
            {renderListaPrazos(processo, true)}
          </section>

          <section style={styles.cartao} aria-label="Peças">
            <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Peças</h2></div>
            {renderPecas(processo, true)}
          </section>

          <section style={{ ...styles.cartao, gridColumn: "1 / -1" }} aria-label="Movimentações">
            <div style={styles.cabCartao}>
              <h2 style={styles.tituloCartao}>Movimentações</h2>
              {abaMovimentacoes === "datajud" && processo.movimentacoes && (
                <span style={styles.textoSecundario}>
                  Fonte: DataJud/CNJ
                  {processo.datajud_atualizado_em &&
                    ` · atualizado em ${new Date(processo.datajud_atualizado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
                </span>
              )}
            </div>
            {/* Duas abas, cada fonte com o que é dela (Spec 014). A DJEN lê o que está guardado */}
            <div role="tablist" aria-label="Fonte das movimentações" style={{ ...styles.abasOrdem, display: "inline-flex", marginBottom: "16px" }}>
              <button
                type="button"
                role="tab"
                id="aba-datajud"
                aria-selected={abaMovimentacoes === "datajud"}
                aria-controls="painel-movimentacoes"
                onClick={() => setAbaMovimentacoes("datajud")}
                style={abaMovimentacoes === "datajud" ? styles.abaOrdemAtiva : styles.abaOrdem}
              >
                DataJud
              </button>
              <button
                type="button"
                role="tab"
                id="aba-djen"
                aria-selected={abaMovimentacoes === "djen"}
                aria-controls="painel-movimentacoes"
                onClick={() => {
                  setAbaMovimentacoes("djen");
                  carregarPublicacoes(processo.id);
                }}
                style={abaMovimentacoes === "djen" ? styles.abaOrdemAtiva : styles.abaOrdem}
              >
                DJEN
              </button>
            </div>
            <div role="tabpanel" id="painel-movimentacoes" aria-labelledby={abaMovimentacoes === "datajud" ? "aba-datajud" : "aba-djen"}>
            {abaMovimentacoes === "djen" ? renderPublicacoesDjen() : processo.movimentacoes ? (
              <>
                {processo.movimentacoes.length > 0 ? (
                  <ol style={styles.linhaTempo}>
                    {processo.movimentacoes.map((mov: any, i: number) => (
                      <li key={i} style={styles.itemTempo}>
                        <span style={styles.pontoTempo} aria-hidden="true" />
                        <time style={styles.dataTempo}>{formatarDataSimples(mov.data)}{mov.hora ? ` ${mov.hora}` : ""}</time>
                        <div>{mov.nome}</div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div style={styles.textoSecundario}>Nenhuma movimentação registrada.</div>
                )}
                <div style={{ ...styles.textoSecundario, marginTop: "6px", fontSize: "13px" }}>
                  O CNJ recebe os dados dos tribunais com atraso: não use estas movimentações para contar prazo.
                </div>
              </>
            ) : (
              <div style={styles.avisoInline}>Este processo ainda não foi consultado no DataJud.</div>
            )}
            </div>
          </section>
        </div>
      </div>
    );
  };

  // Prévia do processo da piscina (abre do Painel e da Piscina)
  const renderModalPrevia = () => {
    if (!processoEmPrevia) return null;
    const processo = processoEmPrevia;
    const etiquetaEstimativa = etiquetaDaPiscina(processo);
    const corEstimativa = etiquetaEstimativa.tipo === "vencido" ? CORES.vencido : etiquetaEstimativa.tipo === "neutro" ? CORES.neutro : CORES.urgente;

    return (
      <div style={styles.veu}>
        <section style={styles.modalPrevia} role="dialog" aria-modal="true" aria-labelledby="titulo-previa">
          <div style={styles.modalCab}>
            <div style={{ minWidth: 0 }}>
              <h2 id="titulo-previa" style={styles.tituloModalPrevia}>{processo.titulo}</h2>
              <div style={styles.cnjGrande}>{formatarCnj(processo.cnj) || "—"} · {processo.tribunal}</div>
            </div>
            <button type="button" onClick={() => setProcessoEmPrevia(null)} aria-label="Fechar" style={styles.btnFechar}>{icone(ICONES.fechar, 18, 2)}</button>
          </div>

          <div style={styles.modalCorpo}>
            <dl style={{ ...styles.dl, gridTemplateColumns: celular ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}>
              {renderDado("Cliente", processo.cliente?.nome)}
              {renderDado("Tipo", processo.tipo_processo)}
              {renderDado("Classe", processo.classe)}
              {renderDado("Cadastrado em", `${new Date(processo.data_cadastro + "Z").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} por ${processo.criador?.nome}`)}
            </dl>

            {/* Estimativa só serve na piscina; depois de assumido vale o prazo oficial */}
            {!processo.responsavel && processo.prazo_estimado && (
              <div style={{ ...styles.estimativa, backgroundColor: corEstimativa.fundo, color: corEstimativa.texto }}>
                <strong>{estimativaVencida(processo) ? "Prazo estimado venceu em" : "Prazo estimado:"} {formatarData(processo.prazo_estimado)}</strong>
                <br />
                Pela publicação: {renderPublicacao(processo)}
              </div>
            )}

            <div>
              {processo.movimentacoes ? (
                renderCaixaDatajud({ ...processo, atualizado_em: processo.datajud_atualizado_em })
              ) : (
                <div style={styles.avisoInline}>Este processo ainda não foi consultado no DataJud.</div>
              )}
              {processo.cnj && (
                <>
                  <button
                    onClick={() => handleAtualizarDatajud(processo)}
                    disabled={atualizandoDatajud}
                    aria-busy={atualizandoDatajud}
                    style={{
                      ...styles.btnMiniNeutro,
                      marginTop: "8px",
                      // Precisa de flex para alinhar o círculo ao texto
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      ...(atualizandoDatajud ? { opacity: 0.7, cursor: "wait" } : {}),
                    }}
                  >
                    {atualizandoDatajud && <span className="spinner" aria-hidden="true" />}
                    {atualizandoDatajud ? "Consultando..." : processo.movimentacoes ? "Atualizar processo" : "Buscar processo"}
                  </button>
                  {renderStatusDatajud()}
                  {erroConsultaPrevia && <div role="alert" style={{ ...styles.avisoInline, marginTop: "8px" }}>{erroConsultaPrevia}</div>}
                </>
              )}
            </div>

            <div>
              <p style={styles.secao}>Prazos</p>
              {renderListaPrazos(processo, false)}
            </div>

            <div>
              <p style={styles.secao}>Peças</p>
              {renderPecas(processo, false)}
            </div>

            {!processo.responsavel && estimativaAntiga(processo) && (
              <div style={styles.textoSecundario}>
                A estimativa venceu há mais de {DIAS_ALERTA_ESTIMATIVA} dias: sem prazo em aberto.{" "}
                {processo.link_publicacao || processo.hash_publicacao
                  ? "Confira nos links acima e no DJEN se existe publicação mais recente."
                  : "Confira no DJEN se existe publicação mais recente."}
              </div>
            )}

            {!processo.responsavel && estimativaVencida(processo) && !estimativaAntiga(processo) && (
              <div style={styles.avisoInline}>
                {processo.peticao_apos_publicacao
                  ? "O prazo desta publicação já venceu, mas há petição registrada depois dela: pode já ter sido respondida."
                  : "O prazo desta publicação já venceu."}
                {processo.link_publicacao || processo.hash_publicacao
                  ? " Confira nos links acima e no DJEN se houve resposta ou se existe publicação mais recente."
                  : " Confira no DJEN se houve resposta ou se existe publicação mais recente."}
              </div>
            )}

            {!processo.responsavel && (
              <div>
                <label htmlFor="data-publicacao" style={styles.rotuloCampo}>
                  Data da publicação no Diário <span style={{ color: CORES.vencido.texto }} aria-hidden="true">*</span>
                </label>
                <input
                  id="data-publicacao"
                  type="date"
                  style={styles.input}
                  value={dataPublicacaoAssumir}
                  onChange={e => setDataPublicacaoAssumir(e.target.value)}
                />
                <div style={{ ...styles.textoSecundario, fontSize: "13px", marginTop: "6px" }}>
                  {/* A frase explica de onde veio a sugestão, mesmo se a data for trocada à mão */}
                  {publicacaoSugerida
                    ? `Sugerida pela última publicação para a sua OAB: ${publicacaoSugerida.tipo || "Comunicação"} de ${formatarDataSimples(publicacaoSugerida.data_disponibilizacao)}.`
                    : !processo.data_publicacao
                    ? "Informe a data em que a publicação saiu no Diário (confira no DJEN)."
                    : processo.link_publicacao || processo.hash_publicacao
                      ? `Sugerida pela publicação encontrada no ${processo.fonte_publicacao ?? "DataJud"}. Confira nos links acima; se a data certa for outra, troque aqui.`
                      : `Sugerida pela publicação encontrada no ${processo.fonte_publicacao ?? "DataJud"}. Confira no DJEN; se a data certa for outra, troque aqui.`}
                </div>
              </div>
            )}

            {erroPrevia && <div style={styles.avisoInline}>{erroPrevia}</div>}
          </div>

          <div style={styles.modalPe}>
            <button type="button" onClick={() => setProcessoEmPrevia(null)} style={styles.btnSecundario}>Fechar</button>
            {processo.responsavel ? (
              <button type="button" onClick={() => abrirProcessoCompleto(processo)} style={styles.btnAcaoBase}>Abrir processo completo</button>
            ) : (
              <button type="button" onClick={handleAssumirProcesso} style={styles.btnAcaoBase}>Assumir processo</button>
            )}
          </div>
        </section>
      </div>
    );
  };

  // Botão "Atualizar todos" e a caixinha "Forçar": Meus processos e Processos do escritório (Spec 013)
  const renderAtualizarTodos = (processos: any[]) => {
    // Só os ativos; encerrado e processo sem CNJ não têm o que buscar no DJEN
    const ativos = processos.filter(p => p.status !== "Encerrado" && p.cnj);
    const travado = rodandoDjen || ativos.length === 0;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
        {/* A dica fica na caixinha: no botão, o title tomava o lugar do "Atualizar todos" no leitor de tela */}
        <label title="Sem marcar, pula os processos consultados no DJEN na última hora" style={{ display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", cursor: "pointer" }}>
          <input type="checkbox" checked={forcarDjen} onChange={e => setForcarDjen(e.target.checked)} style={{ width: "18px", height: "18px" }} />
          Forçar atualização de todos
        </label>
        <button
          type="button"
          onClick={() => rodarDjen(ativos.map(p => ({ processo: p, resultado: "aguardando" as const })), forcarDjen)}
          disabled={travado}
          style={{ ...styles.btnAcaoBase, opacity: travado ? 0.5 : 1, cursor: travado ? "not-allowed" : "pointer" }}
        >
          {rodandoDjen ? "Atualizando..." : "Atualizar todos"}
        </button>
      </div>
    );
  };

  // Janela de progresso do "Atualizar todos": uma linha por processo e, no fim, o resumo
  const renderJanelaDjen = () => {
    if (!linhasDjen) return null;
    const total = linhasDjen.length;
    const feitos = linhasDjen.filter(l => l.resultado !== "aguardando").length;
    const contar = (resultado: ResultadoDjen) => linhasDjen.filter(l => l.resultado === resultado).length;
    const atual = linhasDjen.find(l => l.resultado === "aguardando");
    // No fim, as novas publicações sobem para o topo
    const linhas = rodandoDjen ? linhasDjen : [...linhasDjen].sort((a, b) =>
      (b.resultado === "nova_publicacao" ? 1 : 0) - (a.resultado === "nova_publicacao" ? 1 : 0));

    return (
      <div style={styles.veu}>
        <section style={styles.modalPrevia} role="dialog" aria-modal="true" aria-labelledby="titulo-djen">
          <div style={styles.modalCab}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id="titulo-djen" style={styles.tituloModalPrevia}>
                {rodandoDjen ? `Atualizando pelo DJEN... ${feitos} de ${total}` : `Atualização pelo DJEN: ${feitos} de ${total}`}
              </h2>
              <div role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos} style={styles.barraFundo}>
                <div style={{ ...styles.barra, width: `${total > 0 ? (feitos / total) * 100 : 0}%` }} />
              </div>
            </div>
            <button type="button" onClick={fecharJanelaDjen} aria-label="Fechar" style={styles.btnFechar}>{icone(ICONES.fechar, 18, 2)}</button>
          </div>

          <div style={styles.modalCorpo}>
            {!rodandoDjen && (
              <div role="status" style={{ fontWeight: 600 }}>
                {[
                  `${contar("nova_publicacao")} com nova publicação`,
                  `${contar("sem_novidade")} sem novidade`,
                  `${contar("pulado")} ${contar("pulado") === 1 ? "pulado" : "pulados"}`,
                  `${contar("erro")} com erro`,
                ].join(" · ")}
              </div>
            )}

            <ul style={styles.listaLinhas}>
              {linhas.map((linha, i) => {
                const { processo, resultado } = linha;
                // Hora em que o Argus consultou o DJEN, para o "pulado"
                const hora = processo.djen_consultado_em
                  ? new Date(processo.djen_consultado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
                  : "";
                const texto =
                  resultado === "nova_publicacao" ? `★ Nova publicação${processo.data_publicacao ? ` de ${formatarData(processo.data_publicacao)}` : ""}${temPrazoAConferir(processo) ? ": confira o prazo" : ""}`
                  : resultado === "sem_novidade" ? "✔ Sem novidade"
                  : resultado === "pulado" ? `– Pulado (atualizado ${hora ? `às ${hora}` : "na última hora"})`
                  : resultado === "erro" ? "✖ DJEN não respondeu"
                  : linha === atual && rodandoDjen ? "Consultando..." : "Aguardando";
                const cor =
                  resultado === "nova_publicacao" ? CORES.urgente.texto
                  : resultado === "sem_novidade" ? "#2e7d32"
                  : resultado === "erro" ? CORES.vencido.texto
                  : CORES.suave;
                return (
                  <li key={processo.id} style={{ ...styles.itemLinha, ...(i === 0 && styles.primeiraLinha), alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatarCnj(processo.cnj)}</strong>
                      <span style={styles.segundaLinha}>{processo.titulo}</span>
                      <span style={{ display: "block", marginTop: "2px", fontWeight: 600, color: cor }}>{texto}</span>
                    </div>
                    {/* O ADMIN não tem a tela do processo completo */}
                    {resultado === "nova_publicacao" && !rodandoDjen && user?.perfil !== "ADMIN" && (
                      <button type="button" onClick={() => { fecharJanelaDjen(); abrirProcessoCompleto(processo); }} style={styles.btnMiniNeutro}>
                        Abrir processo
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={styles.modalPe}>
            {!rodandoDjen && contar("erro") > 0 && (
              // Com "forçar": quem deu erro pode ter sido consultado há pouco e não pode ser pulado
              <button
                type="button"
                onClick={() => rodarDjen(linhasDjen.map(l => (l.resultado === "erro" ? { ...l, resultado: "aguardando" as const } : l)), true)}
                style={styles.btnSecundario}
              >
                Tentar de novo os com erro
              </button>
            )}
            <button type="button" onClick={fecharJanelaDjen} style={styles.btnAcaoBase}>{rodandoDjen ? "Parar e fechar" : "Fechar"}</button>
          </div>
        </section>
      </div>
    );
  };

  // Título e subtítulo próprios de cada tela (Spec 007)
  const renderTopo = (titulo: string, subtitulo: string, acao?: React.ReactNode) => (
    <header style={styles.topo}>
      <div>
        <h1 style={styles.tituloPagina}>{titulo}</h1>
        <div style={styles.subtituloPagina}>{subtitulo}</div>
      </div>
      {acao}
    </header>
  );

  // Grade do mês: usada no Painel (cheio = false) e no item Calendário (cheio = true)
  const renderCalendario = (cheio: boolean) => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const diaDaSemanaDoPrimeiro = mesCalendario.getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const totalCelulas = Math.ceil((diaDaSemanaDoPrimeiro + diasNoMes) / 7) * 7;
    const hoje = new Date();
    const nomeMes = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1);

    return (
      <section style={styles.cartao} aria-label="Calendário de prazos">
        <div style={{ ...styles.cabCartao, flexWrap: "wrap" }}>
          <h2 style={styles.tituloCartao}>{nomeMes} de {ano}</h2>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => { const hoje = new Date(); setMesCalendario(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); }}
              style={{ ...styles.btnSeta, width: "auto", padding: "0 14px", fontSize: "15px", fontWeight: 600 }}
            >
              Hoje
            </button>
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={styles.btnSeta}>{icone(ICONES.anterior, 16, 2)}</button>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" style={styles.btnSeta}>{icone(ICONES.proximo, 16, 2)}</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {/* No celular a grade cabe na largura: colunas sem mínimo e uma letra por dia */}
          <div style={celular ? { ...styles.gradeMes, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", minWidth: 0 } : styles.gradeMes}>
            {DIAS_DA_SEMANA.map((dia, i) => (
              <div key={i} style={celular ? { ...styles.diaSemana, padding: "6px 0", textAlign: "center", letterSpacing: 0 } : styles.diaSemana}>
                {celular ? dia.charAt(0) : dia}
              </div>
            ))}
            {Array.from({ length: totalCelulas }, (_, i) => {
              // new Date aceita dia fora do mês: os dias de fora vêm dos meses vizinhos
              const data = new Date(ano, mes, i - diaDaSemanaDoPrimeiro + 1);
              const dentro = data.getMonth() === mes;
              const ehHoje = data.toDateString() === hoje.toDateString();
              const fimDeSemana = i % 7 === 0 || i % 7 === 6;
              const prazosDoDia = dentro
                ? prazosAbertos.filter(p => parseDataLocal(p.data_vencimento).getTime() === data.getTime())
                : [];
              return (
                <div key={i} style={{ ...styles.diaCalendario, minHeight: celular ? "52px" : cheio ? "120px" : "96px", padding: celular ? "4px" : "8px", backgroundColor: fimDeSemana ? "#FAF8F3" : CORES.papel }}>
                  <span style={ehHoje ? styles.numeroHoje : { ...styles.numeroDia, color: dentro ? CORES.suave : "#B3AB9C" }}>
                    {data.getDate()}
                  </span>
                  {celular ? (
                    // No celular cada prazo é só um pontinho com a cor da situação; o texto fica no title/aria-label
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                      {prazosDoDia.map(prazo => (
                        <span
                          key={prazo.id}
                          role="img"
                          aria-label={`${prazo.processo.titulo} · ${analisarPrazo(prazo.data_vencimento).texto}`}
                          title={`${prazo.processo.titulo} · ${formatarCnj(prazo.processo.cnj)}`}
                          style={{ ...styles.bola, width: "8px", height: "8px", borderRadius: "50%", backgroundColor: CORES[analisarPrazo(prazo.data_vencimento).tipo].bola }}
                        />
                      ))}
                    </div>
                  ) : prazosDoDia.map(prazo => (
                    <span
                      key={prazo.id}
                      title={`${prazo.processo.titulo} · ${formatarCnj(prazo.processo.cnj)}`}
                      style={{ ...styles.chip, backgroundColor: CORES[analisarPrazo(prazo.data_vencimento).tipo].fundo, color: CORES[analisarPrazo(prazo.data_vencimento).tipo].texto }}
                    >
                      {prazo.processo.titulo}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.legenda}>
          <span style={styles.itemLegenda}><i style={{ ...styles.bola, backgroundColor: CORES.vencido.bola }} />Vencido</span>
          <span style={styles.itemLegenda}><i style={{ ...styles.bola, backgroundColor: CORES.urgente.bola }} />Vence em até 3 dias</span>
          <span style={styles.itemLegenda}><i style={{ ...styles.bola, backgroundColor: CORES.emdia.bola }} />Em dia</span>
        </div>
      </section>
    );
  };

  // Item da piscina: usado no Painel e na tela Piscina
  const renderItemPiscina = (processo: any, indice = 1) => {
    const etiqueta = etiquetaDaPiscina(processo);
    return (
      <div key={processo.id} style={{ ...styles.itemPiscina, ...(indice === 0 && styles.primeiraLinha) }}>
        <strong>{processo.titulo}</strong>
        <span style={styles.cnj}>{formatarCnj(processo.cnj)} · {processo.tribunal}</span>
        <span style={estiloEtiqueta(etiqueta.tipo)}>{etiqueta.texto}</span>
        <button type="button" onClick={() => abrirPrevia(processo)} style={styles.linkAcao}>Ver prévia e assumir</button>
      </div>
    );
  };

  const renderPainelAdvogado = () => {
    const vencidos = prazosAbertos.filter(p => analisarPrazo(p.data_vencimento).tipo === "vencido").length;
    const urgentes = prazosAbertos.filter(p => analisarPrazo(p.data_vencimento).tipo === "urgente").length;
    const prazosDoMes = prazosAbertos.filter(p => {
      const data = parseDataLocal(p.data_vencimento);
      return data.getFullYear() === mesCalendario.getFullYear() && data.getMonth() === mesCalendario.getMonth();
    }).length;
    const proximos = prazosAbertos.slice(0, 4);
    const nomeMes = MESES[mesCalendario.getMonth()];

    // Data de hoje por extenso, com a primeira letra maiúscula
    const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const resumo = [
      { numero: vencidos, rotulo: vencidos === 1 ? "Prazo vencido" : "Prazos vencidos", cor: CORES.vencido.texto },
      { numero: urgentes, rotulo: urgentes === 1 ? "Vence em até 3 dias" : "Vencem em até 3 dias", cor: CORES.urgente.texto },
      { numero: prazosDoMes, rotulo: `${prazosDoMes === 1 ? "Prazo" : "Prazos"} em ${nomeMes}`, cor: CORES.marca },
      { numero: piscinaProcessos.length, rotulo: piscinaProcessos.length === 1 ? "Processo na piscina" : "Processos na piscina", cor: CORES.marca },
    ];

    return (
      <div style={styles.conteudo}>
        {renderTopo("Painel", dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1))}

        <section style={{ ...styles.resumo, gridTemplateColumns: celular ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }} aria-label="Resumo dos prazos">
          {resumo.map(item => (
            <div key={item.rotulo} style={styles.tile}>
              <span style={{ ...styles.tileNumero, color: item.cor }}>{item.numero}</span>
              <span style={styles.tileRotulo}>{item.rotulo}</span>
            </div>
          ))}
        </section>

        <div style={styles.gradePainel}>
          <div style={{ flex: "2 1 620px", minWidth: 0 }}>{renderCalendario(false)}</div>

          <div style={styles.ladoPainel}>
            <section style={styles.cartao} aria-label="Próximos prazos">
              <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Próximos prazos</h2></div>
              {proximos.length > 0 ? (
                <ul style={styles.listaSemMarcador}>
                  {proximos.map((prazo, i) => {
                    const data = parseDataLocal(prazo.data_vencimento);
                    const situacao = analisarPrazo(prazo.data_vencimento);
                    return (
                      <li key={prazo.id} style={{ ...styles.itemProximo, borderTop: i === 0 ? "none" : `1px solid ${CORES.linha}`, paddingTop: i === 0 ? 0 : "14px" }}>
                        <div style={styles.quando}>
                          <b style={styles.quandoDia}>{data.getDate()}</b>
                          <small style={styles.quandoMes}>{MESES[data.getMonth()].slice(0, 3)}</small>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong>{prazo.processo.titulo}</strong>
                          <div style={styles.cnj}>{formatarCnj(prazo.processo.cnj)} · {prazo.processo.tribunal}</div>
                          <span style={{ ...estiloEtiqueta(situacao.tipo), marginTop: "4px" }}>{situacao.texto}</span>
                          {temPrazoAConferir(prazo.processo) && <div style={{ marginTop: "6px" }}>{renderEtiquetaConferir()}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={styles.textoSecundario}>Nenhum prazo em aberto.</div>
              )}
            </section>

            <section style={styles.cartao} aria-label="Piscina">
              <div style={styles.cabCartao}><h2 style={styles.tituloCartao}>Na piscina</h2></div>
              {piscinaProcessos.length > 0 ? (
                <>
                  {piscinaProcessos.slice(0, 3).map(renderItemPiscina)}
                  {piscinaProcessos.length > 3 && (
                    <button type="button" onClick={() => irPara("piscina")} style={{ ...styles.linkAcao, marginTop: "8px" }}>
                      Ver todos ({piscinaProcessos.length})
                    </button>
                  )}
                </>
              ) : (
                <div style={styles.textoSecundario}>A piscina está vazia.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderAbaCalendario = () => (
    <div style={styles.conteudo}>
      {renderTopo("Calendário", "Prazos em aberto dos seus processos")}
      {renderCalendario(true)}
    </div>
  );

  const renderAbaPiscina = () => (
    <div style={styles.conteudo}>
      {renderTopo("Piscina", `${piscinaProcessos.length} ${piscinaProcessos.length === 1 ? "processo aguardando" : "processos aguardando"} um responsável`)}
      <section style={styles.cartao} aria-label="Processos na piscina">
        {piscinaProcessos.length > 0
          ? piscinaProcessos.map(renderItemPiscina)
          : <div style={styles.textoSecundario}>A piscina está vazia.</div>}
      </section>
    </div>
  );

  const renderAbaMeusProcessos = () => {
    if (processoAberto) return renderProcessoCompleto(processoAberto);

    // Busca por CNJ (com ou sem pontos), título ou nome do cliente
    const termo = semAcento(busca);
    const filtrados = meusProcessos.filter(p =>
      semAcento(`${p.cnj} ${formatarCnj(p.cnj)} ${p.titulo} ${p.cliente?.nome ?? ""}`).includes(termo)
    );
    // Por vencimento: vencido primeiro, depois o mais próximo, sem prazo no fim.
    // Mais recentes: cadastro mais novo primeiro
    const ordenados = [...filtrados].sort((a, b) => {
      if (ordem === "recentes") return String(b.data_cadastro).localeCompare(String(a.data_cadastro));
      const prazoA = prazoAberto(a)?.data_vencimento ?? "9999-12-31";
      const prazoB = prazoAberto(b)?.data_vencimento ?? "9999-12-31";
      return prazoA.localeCompare(prazoB);
    });

    return (
      <div style={styles.conteudo}>
        {renderTopo("Meus processos", `${meusProcessos.length} ${meusProcessos.length === 1 ? "processo sob" : "processos sob"} sua responsabilidade`, renderAtualizarTodos(meusProcessos))}

        <div style={styles.filtros}>
          <label style={styles.busca}>
            {icone(ICONES.busca, 16, 2)}
            <input
              type="search"
              placeholder="Buscar por CNJ, título ou cliente"
              aria-label="Buscar processo"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={styles.campoBusca}
            />
          </label>
          <div style={styles.abasOrdem} role="group" aria-label="Ordenar">
            <button type="button" aria-pressed={ordem === "vencimento"} onClick={() => setOrdem("vencimento")} style={ordem === "vencimento" ? styles.abaOrdemAtiva : styles.abaOrdem}>
              Por vencimento
            </button>
            <button type="button" aria-pressed={ordem === "recentes"} onClick={() => setOrdem("recentes")} style={ordem === "recentes" ? styles.abaOrdemAtiva : styles.abaOrdem}>
              Mais recentes
            </button>
          </div>
        </div>

        <section style={styles.cartaoTabela} aria-label="Lista de processos">
          <table style={styles.tabela}>
            <thead>
              <tr style={styles.tabelaCabecalho}>
                <th style={styles.th}>Processo</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Tribunal</th>
                <th style={styles.th}>Prazo</th>
                <th style={styles.th}><span style={styles.soParaLeitor}>Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {ordenados.length > 0 ? ordenados.map(processo => {
                const vencimento = prazoAberto(processo)?.data_vencimento;
                const infoPrazo = analisarPrazo(vencimento);
                return (
                  <tr key={processo.id} style={styles.tabelaLinha}>
                    <td style={styles.td}>
                      <button type="button" onClick={() => setProcessoAberto(processo)} style={styles.linkCnj}>{formatarCnj(processo.cnj) || "—"}</button>
                      <span style={styles.segundaLinha}>{processo.titulo}</span>
                    </td>
                    <td style={styles.td}>
                      {processo.cliente?.nome || "—"}
                      <span style={styles.segundaLinha}>{rotuloTipoPessoa(processo.cliente?.tipo_pessoa)}</span>
                    </td>
                    <td style={styles.td}>
                      {processo.tribunal}
                      <span style={styles.segundaLinha}>{processo.tipo_processo}</span>
                    </td>
                    <td style={styles.td}>
                      {processo.status === "Encerrado" ? (
                        <span style={estiloEtiqueta("neutro")}>Encerrado em {formatarData(processo.encerrado_em)}</span>
                      ) : (
                        <span style={estiloEtiqueta(infoPrazo.tipo)}>
                          {infoPrazo.texto}{vencimento ? ` · ${formatarData(vencimento).slice(0, 5)}` : ""}
                        </span>
                      )}
                      {temPrazoAConferir(processo) && <div style={{ marginTop: "6px" }}>{renderEtiquetaConferir()}</div>}
                    </td>
                    <td style={styles.tdAcoes}>
                      <button type="button" onClick={() => setProcessoAberto(processo)} style={styles.linkAcao}>Abrir</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} style={styles.tdVazio}>
                    {meusProcessos.length > 0 ? "Nenhum processo encontrado para esta busca." : "Nenhum processo sob sua responsabilidade."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    );
  };

  // Itens do menu lateral, conforme o perfil (Spec 007)
  const itensMenu = user?.perfil === "ADMIN"
    ? [
        { chave: "cadastro", rotulo: "Equipe", icone: ICONES.equipe, ativo: abaAdmin === "cadastro", ir: () => setAbaAdmin("cadastro") },
        { chave: "clientes", rotulo: "Clientes", icone: ICONES.clientes, ativo: abaAdmin === "clientes", ir: () => setAbaAdmin("clientes") },
        { chave: "processos", rotulo: "Processos", icone: ICONES.pasta, ativo: abaAdmin === "processos", ir: () => setAbaAdmin("processos") },
      ]
    : [
        { chave: "painel", rotulo: "Painel", icone: ICONES.painel, ativo: abaAdvogado === "painel", ir: () => irPara("painel") },
        { chave: "calendario", rotulo: "Calendário", icone: ICONES.calendario, ativo: abaAdvogado === "calendario", ir: () => irPara("calendario") },
        { chave: "processos", rotulo: "Meus processos", icone: ICONES.pasta, ativo: abaAdvogado === "processos", ir: () => irPara("processos") },
        { chave: "piscina", rotulo: "Piscina", icone: ICONES.piscina, ativo: abaAdvogado === "piscina", ir: () => irPara("piscina") },
      ];

  return (
    <div style={{ ...styles.container, height: celular ? "auto" : "100vh", flexDirection: celular ? "column" : "row" }}>
      {/* MENU LATERAL (no celular fica em cima) */}
      {/* No celular vira uma faixa só (marca, itens e Sair em linha), rolando de lado se precisar */}
      <nav aria-label="Menu principal" style={celular ? styles.faixaMenu : { ...styles.sidebar, width: "260px", padding: "32px 20px", gap: "28px" }}>
        {/* No celular: em cima a marca e o Sair; embaixo os itens, quebrando linha se não couberem */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={styles.marca}>
            <div style={styles.selo} aria-hidden="true">A</div>
            <div style={{ ...styles.nomeMarca, fontSize: celular ? "20px" : "24px" }}>Argus Legis</div>
          </div>
          {celular && <button type="button" onClick={logout} style={{ ...styles.logoutButton, marginTop: 0 }}>Sair</button>}
        </div>

        <ul style={{ ...styles.listaMenu, flexDirection: celular ? "row" : "column", flexWrap: "wrap" }}>
          {itensMenu.map(item => (
            <li key={item.chave}>
              <button
                type="button"
                // Trocar de aba apaga o aviso da tela anterior (ex.: "Cliente removido.")
                onClick={() => { setAviso(null); item.ir(); }}
                aria-current={item.ativo ? "page" : undefined}
                style={{ ...(item.ativo ? styles.menuItemAtivo : styles.menuItemInativo), whiteSpace: "nowrap", padding: celular ? "8px 10px" : "11px 12px" }}
              >
                {icone(item.icone)}
                {item.rotulo}
              </button>
            </li>
          ))}
        </ul>

        {!celular && (
          <div style={{ ...styles.usuario, marginTop: "auto" }}>
            <strong>{user?.nome || user?.email || "Usuário"}</strong>
            <small style={{ color: CORES.marcaSuave }}>
              {user?.perfil === "ADMIN" ? "Administrador" : "Advogado"}{user?.oab_numero ? ` · OAB ${user.oab_numero}/${user.oab_uf}` : ""}
            </small>
            <button type="button" onClick={logout} style={styles.logoutButton}>Sair</button>
          </div>
        )}
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ ...styles.main, padding: celular ? "24px 16px" : "36px 40px 48px" }}>
        {aviso && (
          <div style={aviso.tipo === "sucesso" ? styles.avisoSucesso : styles.avisoErro}>
            <span>{aviso.texto}</span>
            <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" style={styles.btnFecharAviso}>{icone(ICONES.fechar, 14, 2)}</button>
          </div>
        )}

        {erro && <p style={{ color: CORES.vencido.texto, fontWeight: 600 }}>{erro}</p>}

        {carregando ? (
          <p>Carregando painel...</p>
        ) : (
          user?.perfil === "ADMIN" ? renderPainelAdmin()
            : abaAdvogado === "processos" ? renderAbaMeusProcessos()
            : abaAdvogado === "calendario" ? renderAbaCalendario()
            : abaAdvogado === "piscina" ? renderAbaPiscina()
            : renderPainelAdvogado()
        )}

        {/* A prévia abre do Painel e da Piscina */}
        {user?.perfil !== "ADMIN" && renderModalPrevia()}
        {renderJanelaDjen()}
      </main>
    </div>
  );
}

// --- CONFIGURAÇÃO DE ESTILOS ---
const menuItemBase = {
  display: "flex", alignItems: "center", gap: "12px", width: "100%", boxSizing: "border-box" as const,
  padding: "11px 12px", border: "none", borderRadius: "6px", backgroundColor: "transparent", cursor: "pointer",
  minHeight: "44px", fontSize: "15px", fontWeight: 500 as const, textAlign: "left" as const, color: CORES.marcaSuave,
};

const modalTitulo = { marginTop: 0, paddingBottom: "10px", borderBottom: `1px solid ${CORES.linha}`, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "28px", color: CORES.marca };

const styles = {
  // Estrutura: menu lateral escuro + conteúdo
  container: { display: "flex", width: "100%", margin: 0, backgroundColor: CORES.fundo },
  sidebar: { flexShrink: 0, backgroundColor: CORES.marca, color: CORES.marcaTexto, display: "flex", flexDirection: "column" as const, boxSizing: "border-box" as const, overflowY: "auto" as const },
  marca: { display: "flex", alignItems: "center", gap: "12px" },
  faixaMenu: { display: "flex", flexDirection: "column" as const, gap: "8px", padding: "10px 12px", backgroundColor: CORES.marca, color: CORES.marcaTexto },
  selo: { width: "40px", height: "40px", border: `1.5px solid ${CORES.detalhe}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "22px", fontWeight: 700, color: CORES.detalhe },
  nomeMarca: { fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "24px", fontWeight: 600, letterSpacing: "0.04em" },
  listaMenu: { display: "flex", gap: "4px", margin: 0, padding: 0, listStyle: "none" },
  menuItemAtivo: { ...menuItemBase, color: CORES.marcaTexto, backgroundColor: "rgba(255,255,255,0.08)", boxShadow: `inset 3px 0 0 ${CORES.detalhe}` },
  menuItemInativo: menuItemBase,
  usuario: { display: "flex", flexDirection: "column" as const, gap: "2px", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "18px" },
  logoutButton: { marginTop: "10px", minHeight: "44px", padding: "9px 12px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "6px", color: CORES.marcaSuave, cursor: "pointer", fontSize: "15px", textAlign: "left" as const },
  main: { flex: 1, minWidth: 0, boxSizing: "border-box" as const, overflowY: "auto" as const, backgroundColor: CORES.fundo, color: CORES.tinta },

  // Cabeçalho de cada tela
  conteudo: { display: "flex", flexDirection: "column" as const, gap: "28px" },
  topo: { display: "flex", flexWrap: "wrap" as const, alignItems: "flex-end", justifyContent: "space-between", gap: "16px", borderBottom: `1px solid ${CORES.linha}`, paddingBottom: "20px" },
  tituloPagina: { margin: 0, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "40px", fontWeight: 600, letterSpacing: "0.01em", color: CORES.marca },
  subtituloPagina: { marginTop: "2px", color: CORES.suave },

  // Painel: resumo, calendário e cartões laterais
  resumo: { display: "grid", gap: "16px" },
  tile: { display: "flex", flexDirection: "column" as const, gap: "4px", padding: "18px 20px", backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "8px" },
  tileNumero: { fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "38px", fontWeight: 600, lineHeight: 1 },
  tileRotulo: { color: CORES.suave, fontSize: "14px" },
  gradePainel: { display: "flex", flexWrap: "wrap" as const, gap: "24px", alignItems: "flex-start" },
  ladoPainel: { flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column" as const, gap: "24px" },
  cartao: { padding: "22px 24px", backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "8px", boxSizing: "border-box" as const },
  cartaoTabela: { backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "8px", overflowX: "auto" as const },
  cabCartao: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" },
  tituloCartao: { margin: 0, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "26px", fontWeight: 600, color: CORES.marca },
  btnSeta: { width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "6px", color: CORES.tinta, cursor: "pointer" },

  // Calendário
  gradeMes: { display: "grid", gridTemplateColumns: "repeat(7, minmax(84px, 1fr))", minWidth: "600px", borderTop: `1px solid ${CORES.linha}`, borderLeft: `1px solid ${CORES.linha}` },
  diaSemana: { padding: "8px 10px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: CORES.suave, backgroundColor: CORES.fundo, borderRight: `1px solid ${CORES.linha}`, borderBottom: `1px solid ${CORES.linha}` },
  diaCalendario: { display: "flex", flexDirection: "column" as const, gap: "4px", padding: "8px", minWidth: 0, boxSizing: "border-box" as const, borderRight: `1px solid ${CORES.linha}`, borderBottom: `1px solid ${CORES.linha}` },
  numeroDia: { fontSize: "13px", fontWeight: 600 },
  numeroHoje: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: CORES.marca, color: CORES.marcaTexto, fontSize: "13px", fontWeight: 600 },
  chip: { display: "block", padding: "3px 6px", borderRadius: "4px", fontSize: "12px", lineHeight: 1.3, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  legenda: { display: "flex", flexWrap: "wrap" as const, gap: "16px", marginTop: "14px", fontSize: "13px", color: CORES.suave },
  itemLegenda: { display: "inline-flex", alignItems: "center", gap: "6px" },
  bola: { display: "inline-block", width: "10px", height: "10px", borderRadius: "2px" },

  // Próximos prazos e piscina
  listaSemMarcador: { display: "flex", flexDirection: "column" as const, margin: 0, padding: 0, listStyle: "none" },
  itemProximo: { display: "flex", gap: "14px", padding: "14px 0" },
  quando: { flex: "none", width: "52px", padding: "6px 0", textAlign: "center" as const, backgroundColor: CORES.fundo, border: `1px solid ${CORES.linha}`, borderRadius: "6px" },
  quandoDia: { display: "block", fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "24px", lineHeight: 1, color: CORES.marca },
  quandoMes: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: CORES.detalheTexto },
  cnj: { fontSize: "13px", color: CORES.suave, fontVariantNumeric: "tabular-nums" as const },
  etiqueta: { display: "inline-block", alignSelf: "flex-start", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 },
  itemPiscina: { display: "flex", flexDirection: "column" as const, gap: "6px", padding: "14px 0", borderTop: `1px solid ${CORES.linha}` },
  linkAcao: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 2px", backgroundColor: "transparent", border: "none", borderBottom: `1px solid ${CORES.detalhe}`, color: CORES.marca, cursor: "pointer", fontSize: "15px", fontWeight: 600 },

  // Meus processos: busca, ordenação e tabela
  filtros: { display: "flex", flexWrap: "wrap" as const, gap: "12px", alignItems: "center" },
  busca: { flex: "1 1 280px", display: "flex", alignItems: "center", gap: "8px", minHeight: "44px", padding: "0 12px", boxSizing: "border-box" as const, backgroundColor: CORES.papel, border: "1px solid #C9C1B2", borderRadius: "6px", color: CORES.suave },
  campoBusca: { flex: 1, minWidth: 0, border: "none", backgroundColor: "transparent", fontSize: "15px", color: CORES.tinta },
  abasOrdem: { display: "flex", gap: "4px", padding: "2px", backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "6px" },
  abaOrdem: { minHeight: "44px", padding: "8px 14px", backgroundColor: "transparent", border: "none", borderRadius: "4px", color: CORES.suave, cursor: "pointer", fontSize: "15px" },
  abaOrdemAtiva: { minHeight: "44px", padding: "8px 14px", backgroundColor: CORES.marca, border: "none", borderRadius: "4px", color: CORES.marcaTexto, cursor: "pointer", fontSize: "15px" },
  linkCnj: { padding: 0, backgroundColor: "transparent", border: "none", color: CORES.marca, cursor: "pointer", fontSize: "15px", fontWeight: 600, textAlign: "left" as const, fontVariantNumeric: "tabular-nums" as const },
  segundaLinha: { display: "block", marginTop: "2px", color: CORES.suave, fontSize: "14px" },
  soParaLeitor: { position: "absolute" as const, left: "-9999px" },

  // Tabelas do ADMIN
  pessoa: { display: "flex", alignItems: "center", gap: "12px" },
  inicial: { width: "36px", height: "36px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: CORES.emdia.fundo, color: CORES.marca, fontWeight: 600 },
  cnjTabela: { fontWeight: 600, color: CORES.marca, fontVariantNumeric: "tabular-nums" as const },

  // Listas em linhas (prazos, peças) e dados em colunas (processo completo, prévia)
  listaLinhas: { margin: 0, padding: 0, listStyle: "none" },
  itemLinha: { display: "flex", flexWrap: "wrap" as const, justifyContent: "space-between", gap: "8px 16px", padding: "14px 0", borderTop: `1px solid ${CORES.linha}` },
  primeiraLinha: { borderTop: "none", paddingTop: 0 },
  dl: { display: "grid", gap: "16px 24px", margin: 0 },
  dt: { fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: CORES.suave },
  dd: { margin: "3px 0 0", overflowWrap: "anywhere" as const },
  envio: { display: "flex", flexWrap: "wrap" as const, gap: "10px", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: `1px dashed ${CORES.linha}` },
  btnSecundario: { minHeight: "44px", padding: "10px 18px", backgroundColor: CORES.papel, color: CORES.tinta, border: "1px solid #C9C1B2", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "15px" },

  // Processo completo
  trilha: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: CORES.suave },
  linkTrilha: { padding: 0, backgroundColor: "transparent", border: "none", color: CORES.suave, cursor: "pointer", fontSize: "14px", textDecoration: "underline" },
  cnjGrande: { marginTop: "6px", fontSize: "16px", color: CORES.suave, fontVariantNumeric: "tabular-nums" as const },
  faixa: { display: "flex", flexWrap: "wrap" as const, gap: "12px 32px", alignItems: "center", padding: "16px 20px", borderRadius: "8px" },
  linhaTempo: { margin: 0, padding: "0 0 0 18px", listStyle: "none", borderLeft: `2px solid ${CORES.linha}` },
  itemTempo: { position: "relative" as const, padding: "0 0 16px 12px" },
  pontoTempo: { position: "absolute" as const, left: "-25px", top: "6px", width: "10px", height: "10px", boxSizing: "border-box" as const, borderRadius: "50%", backgroundColor: CORES.papel, border: `2px solid ${CORES.detalhe}` },
  dataTempo: { fontSize: "13px", fontWeight: 600, color: CORES.detalheTexto },

  // Janela da prévia da piscina
  veu: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px", boxSizing: "border-box" as const, overflowY: "auto" as const, backgroundColor: "rgba(17,30,37,0.55)" },
  modalPrevia: { width: "100%", maxWidth: "680px", backgroundColor: CORES.papel, borderRadius: "10px", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden" },
  modalCab: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", padding: "24px 28px 18px", borderBottom: `1px solid ${CORES.linha}` },
  tituloModalPrevia: { margin: 0, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "28px", lineHeight: 1.15, color: CORES.marca },
  btnFechar: { width: "44px", height: "44px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "transparent", border: "none", borderRadius: "6px", color: CORES.suave, cursor: "pointer" },
  modalCorpo: { display: "flex", flexDirection: "column" as const, gap: "20px", padding: "22px 28px" },
  modalPe: { display: "flex", flexWrap: "wrap" as const, justifyContent: "flex-end", gap: "10px", padding: "18px 28px", backgroundColor: "#FAF8F3", borderTop: `1px solid ${CORES.linha}` },
  estimativa: { padding: "14px 16px", border: `1px solid ${CORES.linha}`, borderRadius: "8px" },
  linkPublicacao: { color: "inherit", fontWeight: 600, textDecoration: "underline" },
  secao: { margin: "0 0 6px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: CORES.suave },
  rotuloCampo: { display: "block", marginBottom: "6px", fontWeight: 600 },

  // Cartões, tabelas, formulários e janelas (usados por todas as telas)
  cardInfo: { padding: "20px", backgroundColor: CORES.papel, border: `1px solid ${CORES.linha}`, borderRadius: "8px", overflowX: "auto" as const },
  tituloSecao: { marginTop: 0, paddingBottom: "8px", borderBottom: `2px solid ${CORES.detalhe}`, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "22px", color: CORES.marca },
  badgePrazo: { padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" as const },
  gridInfo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px", fontSize: "14px" },
  label: { display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: CORES.tinta },
  valor: { fontWeight: 600, color: CORES.tinta },
  badgeAtivo: { display: "inline-block", backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 },
  badgeEncerrado: { display: "inline-block", backgroundColor: CORES.neutro.fundo, color: CORES.neutro.texto, padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 },
  badgePiscina: { display: "inline-block", backgroundColor: CORES.urgente.fundo, color: CORES.urgente.texto, padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 },
  btnAcaoBase: { display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", padding: "10px 20px", backgroundColor: CORES.marca, color: CORES.marcaTexto, border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "15px" },
  modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(23,36,43,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" },
  modalContent: { backgroundColor: CORES.papel, padding: "30px", borderRadius: "10px", width: "420px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" },
  modalTituloDourado: modalTitulo,
  modalTituloAzul: modalTitulo,
  modalTituloVermelho: modalTitulo,
  form: { display: "flex", flexDirection: "column" as const, gap: "15px" },
  linhaBotoes: { display: "flex", gap: "10px", marginTop: "10px" },
  input: { width: "100%", height: "44px", minHeight: "44px", padding: "10px 12px", boxSizing: "border-box" as const, backgroundColor: CORES.papel, color: CORES.tinta, border: "1px solid #C9C1B2", borderRadius: "6px", fontSize: "15px" },
  btnCancelar: { flex: 1, minHeight: "44px", padding: "10px", backgroundColor: CORES.neutro.fundo, color: CORES.tinta, border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "15px" },
  btnSalvar: { flex: 1, minHeight: "44px", padding: "10px", backgroundColor: CORES.marca, color: CORES.marcaTexto, border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "15px" },
  cabecalhoAba: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "20px" },
  tituloAba: { margin: 0, fontFamily: FONTE_TITULO, fontVariantNumeric: "lining-nums tabular-nums", fontSize: "32px", color: CORES.marca },
  tabela: { width: "100%", minWidth: "760px", borderCollapse: "collapse" as const, textAlign: "left" as const },
  tabelaCabecalho: { backgroundColor: "#FAF8F3" },
  tabelaLinha: { borderBottom: `1px solid ${CORES.linha}` },
  th: { padding: "12px 16px", borderBottom: `1px solid ${CORES.linha}`, fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, textAlign: "left" as const, whiteSpace: "nowrap" as const, color: CORES.suave },
  td: { padding: "16px", verticalAlign: "top" as const },
  // Célula com botões de 44px: menos espaço em cima para o texto do botão ficar na linha do texto das outras células
  tdAcoes: { padding: "6px 16px 16px", verticalAlign: "top" as const, textAlign: "right" as const },
  tdVazio: { padding: "18px 16px", textAlign: "center" as const, color: CORES.suave },
  textoSecundario: { color: CORES.suave },
  btnMiniNeutro: { minHeight: "44px", padding: "5px 12px", backgroundColor: CORES.papel, color: CORES.tinta, border: `1px solid ${CORES.linha}`, borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  btnConfirmarExclusao: { minHeight: "44px", padding: "5px 12px", backgroundColor: CORES.vencido.bola, color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  avisoSucesso: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c5e3c8", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontWeight: 600 },
  avisoErro: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", backgroundColor: CORES.vencido.fundo, color: CORES.vencido.texto, border: "1px solid #E3C2BE", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontWeight: 600 },
  btnFecharAviso: { minWidth: "44px", minHeight: "44px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: "16px", lineHeight: 1 },
  linhaCnj: { display: "flex", gap: "8px" },
  btnBuscarDatajud: { minHeight: "44px", padding: "0 12px", backgroundColor: CORES.marca, color: CORES.marcaTexto, border: "none", borderRadius: "6px", fontWeight: 600, whiteSpace: "nowrap" as const },
  // Atualizar todos pelo DJEN e prazo "A conferir" (Spec 013)
  barraFundo: { height: "8px", marginTop: "12px", backgroundColor: CORES.neutro.fundo, borderRadius: "999px", overflow: "hidden" },
  barra: { height: "100%", backgroundColor: CORES.marca, transition: "width 0.3s" },
  caixaConferir: { padding: "14px 16px", backgroundColor: "#FBF3E6", border: `1px solid ${CORES.urgente.bola}`, borderRadius: "8px" },
  caixaDatajud: { marginTop: "10px", padding: "12px", backgroundColor: CORES.fundo, border: `1px solid ${CORES.linha}`, borderRadius: "6px", fontSize: "13px", display: "flex", flexDirection: "column" as const, gap: "4px" },
  subtituloDatajud: { marginTop: "8px", fontWeight: 600, color: CORES.marca },
  listaMovimentacoes: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: "4px" },
  itemMovimentacao: { display: "flex", gap: "8px" },
  dataMovimentacao: { color: CORES.suave, whiteSpace: "nowrap" as const, fontVariantNumeric: "tabular-nums" as const },
  notaDatajud: { marginTop: "8px", color: CORES.detalheTexto },
  avisoInline: { backgroundColor: CORES.urgente.fundo, border: "1px solid #E6D2B1", color: CORES.urgente.texto, padding: "10px", borderRadius: "6px", fontSize: "13px" }
};
