export interface LoginData{
    email: string;
    password: string;
}

export interface AuthResponse{
    access_token?: string;
    token_type?: string;
    user: {
        id: number;
        email: string;
        name?: string;
    };
    message?: string;
}