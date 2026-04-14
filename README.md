
---

# ⚖️ Argus Legis API

O **Argus Legis** é um sistema de gestão jurídica de alto desempenho, desenvolvido para centralizar e automatizar o acompanhamento de processos judiciais, gestão de prazos e controle de clientes. Esta API foi construída com foco em **escalabilidade, integridade de dados e arquitetura modular**.

---

## 🚀 Tecnologias Utilizadas

* **Linguagem:** Python 3.11+
* **Framework:** FastAPI (Backend Assíncrono)
* **ORM:** SQLAlchemy (Persistência de dados)
* **Banco de Dados:** PostgreSQL
* **Validação:** Pydantic V2 (Uso de `Annotated` e `AfterValidator`)
* **Infraestrutura:** Docker & Docker Compose
---

## 🏗️ Arquitetura do Projeto

O sistema adota uma **Arquitetura Modular**, separando responsabilidades para facilitar a manutenção e o desenvolvimento em equipe:

* **`app/models/`**: Definição das entidades do banco de dados e relacionamentos (SQLAlchemy).
* **`app/schemas/`**: Contratos de entrada e saída de dados com validação automática (Pydantic).
* **`app/routes/`**: Divisão de endpoints por contexto (Processos, Prazos, Usuários, etc.) via `APIRouter`.
* **`app/utils/`**: Utilitários e validadores customizados.
* **`app/database.py`**: Configuração da engine e sessão do banco de dados.

---

## 🛡️ Destaques de Implementação

### 1. Integridade de Dados e Validação Rigorosa
Implementamos uma validação jurídica brasileira (CPF, CNPJ e CNJ). Utilizando `Annotated` do Pydantic V2, os dados são padronizados (remoção de caracteres especiais) antes de atingirem o banco de dados, garantindo buscas rápidas e sem inconsistências.

### 2. Hierarquia e Multi-tenancy
O sistema utiliza o conceito de **Escritório** como raiz. Usuários, clientes e processos são isolados logicamente por escritório, com suporte a exclusão em cascata para evitar dados órfãos.

### 3. Busca Resiliente e UX
O endpoint de listagem de processos suporta filtros acumulativos e busca por **CNJ parcial**. Graças ao uso do operador `contains` e pré-limpeza via Regex, o advogado pode encontrar processos mesmo digitando números incompletos ou com máscaras variadas.

### 4. Alta Performance (Paginação e Ordenação)
Todos os endpoints de listagem implementam paginação nativa (`skip` e `limit`) e ordenação decrescente por ID, garantindo que o sistema permaneça performático mesmo com grandes volumes de dados.

---

## 📦 Como Executar o Projeto

O projeto é totalmente conteinerizado via Docker. Para rodar o ambiente completo (API + PostgreSQL):

1.  **Clone o repositório:**
    ```bash
    git clone [url-do-repositorio]
    cd argus-legis
    ```

2.  **Suba os containers:**
    ```bash
    docker-compose up --build
    ```

3.  **Acesse a API:**
    Acesse `http://localhost:8000` para conferir o status online.

4.  **Documentação Interativa:**
    Acesse `http://localhost:8000/docs` para visualizar o Swagger UI e testar os endpoints.
