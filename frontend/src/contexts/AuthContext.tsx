import React, { createContext, useState, useEffect, useContext } from 'react'
import { login as loginService} from '../services/authService'
import type { LoginData, AuthResponse } from '../types/auth'

interface AuthContextData {
    usuario: any | null;
    estaLogado: boolean;
    carregando: boolean;
    login: (dados: LoginData) => Promise<void>
    logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode}> = ({ children }) => {
    const [usuario, setUsuario] = useState<any | null>(null);
    const [carregando, setCarregando] = useState(true);

    // Provedor irá rodar sempre que o site abrir
    useEffect(() => {
        const tokenSalvo = localStorage.getItem('token');
        const usuarioSalvo = localStorage.getItem('usuario')

        if(tokenSalvo && usuarioSalvo){
            setUsuario(JSON.parse(usuarioSalvo));
        }
        setCarregando(false);
    }, []);

    const login = async (dados: LoginData) => {
        const resposta: AuthResponse = await loginService(dados);
        setUsuario(resposta.usuario);
        localStorage.setItem('token', resposta.access_token);
        localStorage.setItem('usuario', JSON.stringify(resposta.usuario));
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{
            usuario,
            estaLogado: !!usuario,
            carregando,
            login,
            logout
        }}>
          {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext)