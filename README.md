# projeto_final_integrador_I
Sistema web para monitoramento inteligente de prazos processuais jurídicos, com cálculo automatizado de prazos, gerenciamento de processos e alertas para advogados.

## 🚀 Tecnologias
- **Python 3.10+**
- **FastAPI**
- **PostgreSQL 15**
- **SQLAlchemy**
- **Docker & Docker Compose**

---

## 📋 Pré-requisitos
- Docker e Docker Compose instalados.
- Arquivo `.env` configurado na raiz do projeto.

## 🛠️ Como Rodar o Projeto (O Jeito Fácil)

Para subir o ambiente completo (API + Banco de Dados), você só precisa de um comando:

```bash
docker-compose up --build
```

Após o carregamento, a documentação interativa (Swagger) estará disponível em:
👉 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
> 💡 **Importante:** No arquivo `.env`, certifique-se de que a `DATABASE_URL` aponta para o host **db** (ex: `postgresql://user:pass@db:5432/db_name`), caso contrário, o container da API não conseguirá alcançar o banco de dados.

---

---

## 🧪 Guia de Testes

Para validar as rotas implementadas, siga esta ordem no Swagger:

1. **Escritório:** Crie um escritório no `POST /escritorios/`.
2. **Usuário:** Crie um usuário no `POST /usuarios/` usando o `escritorio_id` gerado.
3. **Cliente:** Cadastre um cliente (Ex: Mesa Verde) no `POST /clientes/`.
4. **Processo:** No `POST /processos/`, vincule o `cliente_id` e o `responsavel_id`.
5. **Agenda de Prazos:** - Cadastre um prazo no `POST /prazos/` vinculado ao processo.
   - Liste os prazos de um processo específico no `GET /processos/{id_processo}/prazos/`.
   - Marque como concluído no `PATCH /prazos/{prazo_id}` enviando `{"finalizado": true}`.

---

## 📂 Estrutura Principal
- `main.py`: Endpoints e lógica da API.
- `models.py`: Tabelas do banco de dados.
- `schemas.py`: Validações de entrada e saída (Pydantic).
- `docker-compose.yml`: Orquestração dos containers.
- `Dockerfile`: Define a criação da imagem da API
- `requirements.txt`: Dependências do projeto



