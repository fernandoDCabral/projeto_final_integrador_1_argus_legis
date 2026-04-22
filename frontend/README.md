
---

# ⚖️ Argus Legis - Front-End

Este é o módulo de interface do projeto **Argus Legis**, um sistema de gestão jurídica focado no monitoramento de processos e prazos. A interface foi projetada para ser rápida, responsiva e integrada nativamente ao nosso ecossistema Docker.

---

## 🛠️ Tecnologias e Versões

Para garantir a performance e a modernidade do sistema, utilizamos as seguintes tecnologias:

* **Core:** [React](https://react.dev/) (Hooks e Componentes Funcionais)
* **Build Tool:** [Vite](https://vitejs.dev/) (v8.0+) - Proporciona Hot Module Replacement (HMR) instantâneo.
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) - Design baseado em utilitários para interface limpa e moderna.
* **Comunicação:** [Axios](https://axios-http.com/) - Para requisições assíncronas à nossa API FastAPI.
* **Ambiente:** [Node.js](https://nodejs.org/) **v25.2.1** (Desenvolvimento) / **v22 LTS** (Recomendado para estabilidade).

---

## 🚀 Como Inicializar

Existem duas formas de rodar este projeto. Escolha a que melhor se adapta ao seu fluxo de trabalho atual:

### Opção A: Via Docker (Recomendado para Integração)
Como o projeto está orquestrado, você pode subir o Front-end junto com o Banco de Dados e a API com um único comando na **raiz do projeto**:

```bash
docker compose up --build
```
* **Acesso:** `http://localhost:5173`
* **Vantagem:** O Docker já configura as redes e garante que o Front "enxergue" a API automaticamente.

### Opção B: Desenvolvimento Local (Manual)
Caso queira trabalhar apenas na interface sem usar containers para o Front:

1.  **Instalar dependências:** (Necessário apenas na primeira vez ou quando houver novos pacotes)
    ```bash
    npm install
    ```
2.  **Iniciar servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

---

## ⚙️ Configurações Importantes

### 1. Variáveis de Ambiente
O projeto utiliza variáveis de ambiente para definir a URL da API.
* **Variável:** `VITE_API_URL`
* **Valor Padrão:** `http://localhost:8000`

> 💡 **Lembrete de Desenvolvimento:** Para acessar variáveis de ambiente no Vite, você **não** usa `process.env`. Utilize a sintaxe do ESM:
> ```javascript
> const API_URL = import.meta.env.VITE_API_URL;
> ```

### 2. Sincronia com o Backend (CORS)
A API está configurada para aceitar requisições apenas das origens `localhost:5173` e `127.0.0.1:5173`. Se você alterar a porta do front, lembre-se de avisar ao **Victor** para atualizar a "lista de convidados" (CORS) no Backend.

### 3. Ordem de Subida
Graças ao **Docker Healthcheck** implementado, o sistema segue esta ordem:
`Banco de Dados (Healthy) -> API FastAPI -> Frontend (Vite)`

---

## 📂 Estrutura de Pastas Sugerida

Para manter o projeto organizado enquanto crescemos, seguiremos este padrão:
* `src/components/`: Componentes reutilizáveis (Botões, Cards, Modais).
* `src/pages/`: Telas completas do sistema (Dashboard, Lista de Processos).
* `src/services/`: Configurações do Axios e chamadas para a API.
* `src/assets/`: Imagens, ícones e estilos globais.

---

## ⚠️ Notas de Compatibilidade

> **Atenção:** Este módulo foi inicializado com Node.js **v25.2.1**. Caso encontre erros de "Unsupported engine" ou falhas no `npm install`, delete a pasta `node_modules` e o arquivo `package-lock.json`, e tente rodar o comando novamente utilizando uma versão igual ou superior à **v22 (LTS)**.

---
*Documentação atualizada em: 21 de Abril de 2026.*

---

