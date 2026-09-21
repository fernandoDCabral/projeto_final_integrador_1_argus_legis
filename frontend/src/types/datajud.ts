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
}
