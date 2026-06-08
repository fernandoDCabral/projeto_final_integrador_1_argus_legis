import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptador de requisição
// Verifica se o token JWT existe antes de enviar a requisição
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, 
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptador de resposta
// Verifica a resposta do backend (FastAPI)
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const urlRequisicao = error.config?.url || "";
        const isRotaDeLogin = urlRequisicao.includes('/auth/');

        if(error.response && error.response.status === 401 && !isRotaDeLogin) {
            console.error("Sessão expirada ou não autorizada. Deslogando...");

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;