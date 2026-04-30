export interface LoginData{
    email: string;
    senha: string;
}

export interface AuthResponse{
    access_token: string;
    token_type: string;
    usuario: {
        nome: string;
        email: string;
    };
}