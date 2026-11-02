export interface MovimentacaoDatajud {
  data: string; // "YYYY-MM-DD"
  hora: string | null;
  codigo: number | null;
  nome: string;
}

export interface ConsultaDatajud {
  cnj: string;
  tribunal: string;
  grau: string | null;
  orgao_julgador: string | null;
  classe: string | null;
  assuntos: string[];
  data_ajuizamento: string | null;
  atualizado_em: string | null;
  titulo_sugerido: string | null;
  tipo_processo_sugerido: string | null;
  movimentacoes: MovimentacaoDatajud[];
  data_publicacao: string | null;
  // Publicação que vale: do DJEN ou do DataJud (Spec 010)
  data_disponibilizacao: string | null;
  fonte_publicacao: string | null; // "DJEN" ou "DataJud"
  tipo_publicacao: string | null;
  link_publicacao: string | null;
  hash_publicacao: string | null;
  peticao_apos_publicacao: boolean;
  encerrado_em: string | null; // arquivamento definitivo (Spec 001)
}

// Resposta de POST /processos/{id}/djen (Spec 013): o processo vem junto, já atualizado
export type ResultadoDjen = "nova_publicacao" | "sem_novidade" | "pulado" | "erro";

// Publicação do DJEN guardada para o processo (Spec 014), da mais nova para a mais antiga
export interface Publicacao {
  id: number;
  data_disponibilizacao: string;
  data_publicacao: string;
  tipo: string | null;
  orgao: string | null;
  link: string | null;
  oabs: string[];
  // true quando a OAB do usuário logado está entre as destinatárias
  para_mim: boolean;
}
