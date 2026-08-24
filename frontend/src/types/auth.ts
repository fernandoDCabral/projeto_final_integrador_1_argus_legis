export interface LoginData{
    email: string;
    password: string;
}

export interface UsuarioLogado{
    id: number;
    email: string;
    nome: string;
    perfil: string;
}

export interface AuthResponse{
    access_token?: string;
    token_type?: string;
    user: UsuarioLogado;
    message?: string;
}

// Cadastro de um escritório novo junto com o seu primeiro ADMIN
export interface RegistroEscritorioData{
    nome_fantasia: string;
    cnpj: string;
    admin_nome: string;
    admin_email: string;
    admin_senha: string;
    admin_oab?: string | null;
}

export interface RegistroEscritorioResponse extends AuthResponse{
    escritorio_id: number;
}
