// Máscaras de digitação. O backend grava sempre apenas dígitos, então a
// pontuação existe só para leitura — nunca é enviada.

const digitos = (valor: string, max: number) =>
  valor.replace(/\D/g, '').slice(0, max);

export const formatarCpf = (valor: string) =>
  digitos(valor, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');

export const formatarCnpj = (valor: string) =>
  digitos(valor, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

export const formatarTelefone = (valor: string) => {
  const d = digitos(valor, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');

// Mostra o documento que o cliente realmente tem, já formatado
export const documentoDoCliente = (cliente: {
  cpf?: string | null;
  cnpj?: string | null;
}) => {
  if (cliente.cpf) return formatarCpf(cliente.cpf);
  if (cliente.cnpj) return formatarCnpj(cliente.cnpj);
  return '—';
};

export const rotuloTipoPessoa = (tipo: string) => {
  const normalizado = tipo?.toUpperCase();
  if (normalizado === 'FISICA') return 'Pessoa física';
  if (normalizado === 'JURIDICA') return 'Pessoa jurídica';
  return tipo || '—';
};

// Data sem hora vinda da API ("2026-06-16"). Passar por new Date() a leria
// como meia-noite UTC, e no Brasil apareceria o dia anterior
export const formatarDataSimples = (iso: string) =>
  iso.split('-').reverse().join('/');
