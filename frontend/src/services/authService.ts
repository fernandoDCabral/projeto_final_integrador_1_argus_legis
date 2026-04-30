import api from './api'
import type {LoginData, AuthResponse } from '../types/auth'

export const login = async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);

    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token)
    }

    return response.data;
 };

export const logout = () => {
    localStorage.removeItem('token');
    // Futuramente, adicionar remoção de outros dados como nome do usuário
    window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
};

