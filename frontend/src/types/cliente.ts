export type TipoPessoa = 'FISICA' | 'JURIDICA';

export interface Cliente {
  id: number;
  nome: string;
  tipo_pessoa: string;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone: string;
  // Endereço em campos separados (Spec 006); clientes antigos só têm o logradouro
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  escritorio_id: number;
}

export interface ClienteCreate {
  nome: string;
  tipo_pessoa: TipoPessoa;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone: string;
  cep: string; // só os 8 dígitos
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}
