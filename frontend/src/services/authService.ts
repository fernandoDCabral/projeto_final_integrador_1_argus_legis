import api from './api'
import type {LoginData, AuthResponse } from '../types/auth'

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

