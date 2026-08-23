import React, { createContext, useState, useEffect, useContext } from 'react'
import {
    login as loginService,
    registrarEscritorio as registrarEscritorioService
} from '../services/authService'
import type {
    LoginData,
    AuthResponse,
    RegistroEscritorioData,
    UsuarioLogado
} from '../types/auth'

interface AuthContextData {
    user: UsuarioLogado | null;
    estaLogado: boolean;
    carregando: boolean;
    login: (dados: LoginData) => Promise<void>
    registrarEscritorio: (dados: RegistroEscritorioData) => Promise<void>
    logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<UsuarioLogado | null>(null);
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

    // Login e cadastro de escritório terminam do mesmo jeito: com um token
    // e um usuário para persistir
    const iniciarSessao = (resposta: AuthResponse) => {
        setUser(resposta.user);
        localStorage.setItem('token', resposta.access_token || 'token_temporario');
        localStorage.setItem('user', JSON.stringify(resposta.user));
    };

    const login = async (dados: LoginData) => {
        const resposta: AuthResponse = await loginService(dados);
        iniciarSessao(resposta);
    };

    // Quem cadastra o escritório já entra autenticado como ADMIN dele,
    // sem passar de novo pela tela de login
    const registrarEscritorio = async (dados: RegistroEscritorioData) => {
        const resposta = await registrarEscritorioService(dados);
        iniciarSessao(resposta);
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
            registrarEscritorio,
            logout
        }}>
          {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext)
