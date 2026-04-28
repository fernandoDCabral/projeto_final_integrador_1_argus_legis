
---

# ⚖️ Argus Legis - Front-End

Este é o módulo de interface do projeto **Argus Legis**, um sistema de gestão jurídica focado no monitoramento de processos e prazos. A interface foi projetada para ser rápida, responsiva e utiliza **TypeScript** para garantir maior segurança e previsibilidade no desenvolvimento.

---

## 🛠️ Tecnologias e Versões

* **Core:** [React](https://react.dev/) + **TypeScript** (Tipagem estrita para maior robustez).
* **Build Tool:** [Vite](https://vitejs.dev/) - Performance de próxima geração e HMR instantâneo.
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) - Design baseado em utilitários para interface limpa e moderna.
* **Comunicação:** [Axios](https://axios-http.com/) - Para requisições assíncronas à API FastAPI.
* **Ambiente:** [Node.js](https://nodejs.org/) **v25.2.1** (Desenvolvimento) / **v22 LTS** (Recomendado).

---

## 🚀 Telas e Funcionalidades Atuais

Atualmente, o frontend já conta com as seguintes implementações funcionais:

### 1. Autenticação e Registro (`Login.tsx`)
Uma interface dual que permite tanto o acesso quanto a criação de novas contas:
* **Login:** Entrada via E-mail e Senha.
* **Cadastro:** Fluxo expandido para novos usuários, coletando **Nome**, **E-mail**, **Senha** e **Tipo de Perfil** (Advogado ou Administrador).


### 2. Painel Principal (`Dashboard.tsx`)
A "central de comando" do advogado após o acesso ao sistema:
* **Mensagem de Boas-Vindas:** Confirmação visual de login bem-sucedido.
* **Barra de Navegação Lateral (Sidebar):** Menu estruturado com acesso rápido a:
    * 🏠 **Dashboard:** Visão geral do sistema.
    * 📂 **Processos:** Gestão da base processual.
    * 📅 **Prazos:** Monitoramento de datas críticas.
* *Nota: A navegação interna e as telas de destino dos menus laterais estão em fase de prototipagem.*

---

## ⚙️ Configurações e Tipagem

### 1. Variáveis de Ambiente
O projeto utiliza variáveis de ambiente para definir a URL da API.
* **Variável:** `VITE_API_URL`
* **Acesso (TS):**
* ```typescript
    const API_URL = import.meta.env.VITE_API_URL;
    ```

### 2. Suporte ao TypeScript
Utilizamos o arquivo `src/vite-env.d.ts` para mapear as definições de ambiente e garantir que o compilador reconheça as variáveis do Vite, evitando erros de tipagem durante o desenvolvimento.

---

## 📂 Estrutura de Pastas

* `public/`: Arquivos estáticos servidos na raiz (ex: `logo.jpg`).
* `src/pages/`: Telas completas do sistema (Login, Dashboard).
* `src/components/`: Componentes menores e reutilizáveis (Botões, Inputs).
* `src/assets/`: Estilos globais e recursos de imagem.
* `src/services/`: Configuração do Axios e chamadas para a API.

---

## 🐳 Integração Docker

O frontend está configurado para subir automaticamente após a API estar saudável.
* **Comando Único (na raiz):** `docker compose up --build`
* **Hot Reload:** O volume está mapeado para que alterações no código reflitam no container em tempo real.

---
*Documentação atualizada em: 23 de Abril de 2026.*

---
