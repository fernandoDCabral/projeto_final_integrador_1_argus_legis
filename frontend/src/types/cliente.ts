export type TipoPessoa = 'FISICA' | 'JURIDICA';

export interface Cliente {
  id: number;
  nome: string;
  tipo_pessoa: string;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone: string;
  endereco: string;
  escritorio_id: number;
}

export interface ClienteCreate {
  nome: string;
  tipo_pessoa: TipoPessoa;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone: string;
  endereco: string;
}
