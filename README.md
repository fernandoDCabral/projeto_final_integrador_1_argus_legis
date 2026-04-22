
---

# ⚖️ Argus Legis

O **Argus Legis** é um ecossistema completo de gestão jurídica, projetado para centralizar e automatizar o acompanhamento de processos judiciais, gestão de prazos e controle de clientes. O sistema utiliza uma arquitetura moderna e conteinerizada para garantir alta performance e escalabilidade.

---

## 🏗️ Arquitetura do Sistema

O projeto é estruturado em três camadas principais que operam de forma integrada através de containers Docker:



1.  **Frontend (Interface):** Desenvolvido em React + Vite, focado em uma UX fluida para advogados.
2.  **Backend (API):** Construído com FastAPI, responsável pelas regras de negócio e validações jurídicas.
3.  **Database (Persistência):** PostgreSQL 15, garantindo integridade e segurança dos dados jurídicos.

---

## 🚀 Tecnologias Utilizadas

### **Frontend**
* **React + Vite:** Interface reativa de alta performance.
* **Tailwind CSS:** Design modular e responsivo.
* **Axios:** Comunicação assíncrona com a API.

### **Backend**
* **Python 3.11+ & FastAPI:** Processamento assíncrono.
* **SQLAlchemy:** Mapeamento objeto-relacional (ORM).
* **Pydantic V2:** Validação rigorosa de dados (CPF, CNPJ, CNJ).

### **Infraestrutura**
* **Docker & Docker Compose:** Padronização do ambiente de desenvolvimento.
* **PostgreSQL:** Banco de dados relacional robusto.

---

## 📂 Estrutura de Diretórios

```text
argus_legis/
├── app/                # Código-fonte da API (Backend Python)
├── frontend/           # Interface do usuário (React + Vite)
├── database/           # Scripts e volumes do banco de dados
├── .env                # Variáveis de ambiente globais
└── docker-compose.yml  # Maestro da orquestração dos serviços
```

---

## ⚙️ Variáveis de Ambiente (.env)

Para rodar o projeto, crie um arquivo `.env` na raiz seguindo o modelo:

```env
# Configurações do Banco de Dados
POSTGRES_USER=admin_argus
POSTGRES_PASSWORD=sua_senha_aqui
POSTGRES_DB=argus_db
POSTGRES_PORT=5432

# Configurações do Frontend
VITE_API_URL=http://localhost:8000
```

---

## 📦 Como Executar o Ambiente Completo

O projeto utiliza **Docker Healthchecks** para garantir que os serviços subam na ordem correta:
`Banco de Dados (Healthy) -> API (Online) -> Frontend (Disponível)`.



1.  **Clone o repositório:**
    ```bash
    git clone [url-do-repositorio]
    cd argus-legis
    ```

2.  **Suba os containers:**
    ```bash
    docker compose up --build
    ```

3.  **Acesse os serviços:**
    * **Frontend:** [http://localhost:5173](http://localhost:5173) (Interface do Advogado)
    * **API Backend:** [http://localhost:8000](http://localhost:8000) (Status do Sistema)
    * **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs) (Documentação Técnica)

---

## 🛡️ Destaques de Engenharia

* **Resiliência de Startup:** Implementação de `healthchecks` no Docker Compose para evitar erros de conexão na inicialização.
* **Segurança (CORS):** Middleware configurado para permitir comunicação segura entre o domínio do frontend e a API.
* **Validação Jurídica:** Limpeza e validação de documentos brasileiros e numeração de processos CNJ em nível de API.

---
*Desenvolvido como projeto de Engenharia de Software - 2026.*

---

