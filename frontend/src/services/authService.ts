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

