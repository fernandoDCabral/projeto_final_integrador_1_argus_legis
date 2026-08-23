import api from './api'
import type {
    LoginData,
    AuthResponse,
    RegistroEscritorioData,
    RegistroEscritorioResponse
} from '../types/auth'

export const login = async (data: LoginData): Promise<AuthResponse> => {
    const params = new URLSearchParams();
    params.append('username', data.email as string);
    params.append('password', data.password as string);
    
    const response = await api.post<AuthResponse>(
        '/auth/',
        params,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );
    
    return response.data;
 };

// Cria o escritório e o seu primeiro administrador. É a única rota que
// devolve um token sem exigir login anterior.
export const registrarEscritorio = async (
    data: RegistroEscritorioData
): Promise<RegistroEscritorioResponse> => {
    const response = await api.post<RegistroEscritorioResponse>(
        '/registro/escritorio',
        data
    );

    return response.data;
};

// --- RECUPERAÇÃO DE SENHA ---

// A resposta é sempre a mesma, exista ou não o e-mail cadastrado
export const solicitarRecuperacao = async (email: string): Promise<string> => {
    const response = await api.post<{ message: string }>(
        '/auth/esqueci-senha', { email }
    );
    return response.data.message;
};

export const validarTokenRecuperacao = async (token: string) => {
    const response = await api.get<{ valido: boolean; nome: string; email: string }>(
        `/auth/redefinir-senha/${token}`
    );
    return response.data;
};

export const redefinirSenha = async (
    token: string,
    nova_senha: string
): Promise<string> => {
    const response = await api.post<{ message: string }>(
        '/auth/redefinir-senha', { token, nova_senha }
    );
    return response.data.message;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user')
    // Leva o usuário de volta para a tela de login
    window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
};

