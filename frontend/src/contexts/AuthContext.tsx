import React, { createContext, useState, useEffect, useContext } from 'react'
import { login as loginService} from '../services/authService'
import type { LoginData, AuthResponse } from '../types/auth'

interface AuthContextData {
    user: any | null;
    estaLogado: boolean;
    carregando: boolean;
    login: (dados: LoginData) => Promise<void>
    logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [carregando, setCarregando] = useState(true);

    // Este bloco serve para verificar o token e o usuário salvo
    // no localStorage quando a página é recarregada ou quando o usuário 
    // retorna ao site após um período de inatividade
    useEffect(() => {
        const tokenSalvo = localStorage.getItem('token');
        const userSalvo = localStorage.getItem('user')

        if(tokenSalvo && userSalvo){
            setUser(JSON.parse(userSalvo));
        }
        setCarregando(false);
    }, []);

    const login = async (dados: LoginData) => {
        const resposta: AuthResponse = await loginService(dados);
        setUser(resposta.user);
        localStorage.setItem('token', resposta.access_token || 'token_temporario');
        localStorage.setItem('user', JSON.stringify(resposta.user));
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            estaLogado: !!user,
            carregando,
            login,
            logout
        }}>
          {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext)