# ⚖️ Argus Legis

O **Argus Legis** é um ecossistema completo de gestão jurídica, projetado para centralizar e automatizar o acompanhamento de processos judiciais, gestão de prazos e controle de clientes. O sistema utiliza uma arquitetura moderna e conteinerizada para garantir alta performance e escalabilidade.

---

## 🏗️ Arquitetura do Sistema

O projeto é estruturado em camadas que operam de forma integrada através de containers Docker:

1.  **Frontend (Interface):** Desenvolvido em **React + TypeScript + Vite**, garantindo uma interface rápida, tipada e segura.
2.  **Backend (API):** Construído com **FastAPI (Python)**, responsável pelas regras de negócio e validações jurídicas.
3.  **Database (Persistência):** **PostgreSQL 15**, com persistência de dados via volumes Docker.

---

## 🚀 Tecnologias Utilizadas

### **Frontend**
* **React + TypeScript:** Desenvolvimento robusto com checagem de tipos estática.
* **Vite:** Ferramenta de build de próxima geração para um desenvolvimento ágil e suporte nativo ao Docker via HMR/Polling.
* **Tailwind CSS:** Design modular e responsivo.
* **Axios:** Cliente HTTP configurado com Interceptadores para gerenciamento automático de tokens e sessões.
* **Context API:** Gerenciamento de estado global para controle de autenticação do usuário.

### **Backend**
* **Python 3.11+ & FastAPI:** Alta performance com suporte a operações assíncronas.
* **SQLAlchemy:** ORM para comunicação eficiente com o banco de dados.
* **Pydantic V2:** Validação rigorosa de dados (CPF, CNPJ, CNJ) e gestão centralizada de configurações (BaseSettings).
* **Segurança (OAuth2 & JWT):** Autenticação robusta utilizando o protocolo OAuth2PasswordBearer e tokens JWT (JSON Web Tokens).

### **Infraestrutura**
* **Docker & Docker Compose:** Padronização completa do ambiente de desenvolvimento.
* **PostgreSQL:** Banco de dados relacional robusto.

---

## 📂 Estrutura de Diretórios

```text
argus_legis/
├── app/                # Backend (API Python)
│   ├── core/           # Configurações centralizadas (Pydantic Settings) e Segurança
│   ├── models/         # Modelos do banco de dados (SQLAlchemy)
│   ├── routes/         # Definição das rotas e endpoints protegidos
│   ├── schemas/        # Esquemas de validação de entrada/saída
│   ├── utils/          # Funções auxiliares e utilitárias
│   ├── database.py     # Configuração e conexão com o banco
│   └── main.py         # Ponto de entrada da aplicação (CORS Integrado)
├── frontend/           # Interface do usuário (React + TypeScript)
│   ├── src/
│   │   ├── contexts/   # Provedores de estado (AuthContext)
│   │   ├── services/   # Configuração da API e autenticação (api.ts, authService.ts)
│   │   └── pages/      # Telas do sistema (Login, Dashboard)
├── .env                # Variáveis de ambiente (Segredos)
├── .env.example        # Modelo de configuração para novos devs
├── Dockerfile          # Configuração do container do Backend
├── docker-compose.yml  # Orquestrador dos serviços
└── requirements.txt    # Dependências do Python
```

---

## ⚙️ Variáveis de Ambiente (.env)

Para rodar o projeto, crie um arquivo `.env` na raiz seguindo o modelo do arquivo `.env.example`:

```env
# Configurações da Aplicação
APP_NAME="Argus Legis"
DEBUG=True

# Configurações do Banco de Dados
POSTGRES_USER=admin_argus
POSTGRES_PASSWORD=sua_senha
POSTGRES_SERVER=db
POSTGRES_PORT=5432
POSTGRES_DB=argus_db
DATABASE_URL=postgresql://admin_argus:sua_senha@db:5432/argus_db

# Segurança e Autenticação (JWT)
SECRET_KEY=sua_chave_secreta_super_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Configurações do Frontend / CORS
VITE_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

```

---

## 📦 Como Executar o Ambiente Completo

O projeto utiliza **Docker Healthchecks** para garantir a sincronia entre os serviços:
`Banco de Dados (Pronto) -> API FastAPI (Online) -> Frontend Vite (Disponível)`.

1. **Clone o repositório:**
```bash
git clone [url-do-repositorio]
cd argus-legis

```


2. **Suba os containers:**
```bash
docker compose up --build -d

```


3. **Acesse os serviços:**
* **Frontend:** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)
* **Swagger UI (Docs):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)



---

## 🛡️ Destaques de Engenharia

* **Autenticação Ponta a Ponta:** Fluxo de login seguro com OAuth2 e JWT. O frontend utiliza interceptadores Axios para injetar tokens silenciosamente em rotas protegidas e deslogar o usuário em caso de expiração (Erro 401).
* **Gestão Centralizada de Configurações:** Uso avançado do `pydantic-settings` para validar tipagens de variáveis de ambiente antes da inicialização do servidor.
* **Segurança e Tipagem:** Uso de TypeScript e Pydantic para garantir integridade de dados do banco de dados até a renderização na tela.
* **Resiliência:** Implementação de `healthchecks` no Docker Compose para evitar erros de conexão na inicialização.

---

*Atualizado em: 29 de Maio de 2026.*

---
