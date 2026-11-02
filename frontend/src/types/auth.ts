export interface LoginData{
    email: string;
    password: string;
}

export interface UsuarioLogado{
    id: number;
    email: string;
    nome: string;
    perfil: string;
    // OAB em duas partes, no formato do DJEN: "56977" e "CE" (Spec 014)
    oab_numero?: string | null;
    oab_uf?: string | null;
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
    admin_oab_numero?: string | null;
    admin_oab_uf?: string | null;
}

export interface RegistroEscritorioResponse extends AuthResponse{
    escritorio_id: number;
}
