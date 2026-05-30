
# ⚖️ Argus Legis - Front-End

Este é o módulo de interface do projeto **Argus Legis**, um sistema de gestão jurídica focado no monitoramento de processos e prazos. A interface foi projetada para ser rápida, responsiva e utiliza **TypeScript** para garantir maior segurança e previsibilidade no desenvolvimento.

---

## 🛠️ Tecnologias e Versões

* **Core:** [React](https://react.dev/) + **TypeScript** (Tipagem estrita para maior robustez).
* **Build Tool:** [Vite](https://vitejs.dev/) - Performance de próxima geração e HMR configurado via Polling para containers.
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) - Design baseado em utilitários para interface limpa e moderna.
* **Comunicação e Segurança:** [Axios](https://axios-http.com/) configurado com Interceptadores de Requisição/Resposta para gestão automática do token JWT.
* **Gerenciamento de Estado:** **Context API** nativa do React para controle de sessão global do usuário.
* **Ambiente:** [Node.js](https://nodejs.org/) **v25.2.1** (Desenvolvimento) / **v22 LTS** (Recomendado).

---

## 🚀 Telas e Funcionalidades Atuais

Atualmente, o frontend conta com um fluxo completo de autenticação e visualização:

### 1. Autenticação e Registro (`Login.tsx`)
Uma interface dual que permite tanto o acesso quanto a criação de contas, totalmente integrada com o backend via OAuth2:
* **Login Seguro:** Validação de credenciais e armazenamento de token JWT e dados não-sensíveis do usuário via `AuthContext` e `localStorage`.
* **Tratamento de Erros:** Captura inteligente de respostas do FastAPI (arrays de erro 422 ou credenciais inválidas 401) com exibição amigável para o usuário.
* **Cadastro:** Fluxo expandido coletando Nome, E-mail, Senha e Tipo de Perfil (Advogado ou Administrador).

### 2. Painel Principal (`Dashboard.tsx` - Rota Protegida)
A "central de comando" do advogado, que agora consome dados reais da API:
* **Sessão Ativa:** Exibe de forma dinâmica as boas-vindas utilizando a memória global do React.
* **Listagem de Processos:** Busca automatizada e segura (via Interceptador Axios) na rota `/processos/`, exibindo exclusivamente os processos atrelados ao advogado logado.
* **Barra de Navegação Lateral (Sidebar):** Menu estruturado com acesso rápido a:
    * 🏠 **Dashboard:** Visão geral do sistema.
    * 📂 **Processos:** Gestão da base processual.
    * 📅 **Prazos:** Monitoramento de datas críticas.

---

## ⚙️ Configurações e Tipagem

### 1. Variáveis de Ambiente e API
O projeto utiliza instâncias customizadas do Axios para facilitar a comunicação:
* **Variável:** `VITE_API_URL`
* A instância `api.ts` lê essa variável e injeta automaticamente o cabeçalho `Authorization: Bearer <token>` em todas as requisições, além de redirecionar silenciosamente para `/login` caso o token expire.

### 2. Suporte ao TypeScript
Utilizamos o arquivo `src/vite-env.d.ts` para mapear as definições de ambiente e garantir que o compilador reconheça as variáveis do Vite, evitando erros de tipagem durante o desenvolvimento.

---

## 📂 Estrutura de Pastas

* `public/`: Arquivos estáticos servidos na raiz (ex: `logo.jpg`).
* `src/pages/`: Telas completas do sistema (Login, Dashboard).
* `src/components/`: Componentes menores e reutilizáveis (Botões, Inputs).
* `src/contexts/`: Provedores de estado global (ex: `AuthContext.tsx`).
* `src/services/`: Configuração do Axios (`api.ts`) e abstração das chamadas à API (`authService.ts`).
* `src/assets/`: Estilos globais e recursos de imagem.

---

## 🐳 Integração Docker

O frontend está configurado para subir automaticamente após a API estar saudável.
* **Comando Único (na raiz):** `docker compose up --build -d`
* **Hot Reload Otimizado:** O `vite.config.ts` utiliza `watch: { usePolling: true }` para garantir que o container capture todas as edições de código em tempo real no Windows/Linux.

---
*Documentação atualizada em: 30 de Maio de 2026.*

---