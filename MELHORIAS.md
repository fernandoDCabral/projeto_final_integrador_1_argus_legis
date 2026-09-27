# 🛠️ Melhorias pendentes — Argus Legis

Lista de trabalho em aberto, em ordem de prioridade. Atualizado em **19/08/2026**.

Cada item tem o **porquê** junto, para não virar uma lista de tarefas sem contexto
daqui a três meses.

---

## ✅ Já entregue

Para saber de onde partimos:

- **Cadastro público de escritório** (`POST /registro/escritorio`) — cria o escritório
  e o primeiro ADMIN na mesma transação, já devolvendo o token. Acabou a necessidade
  de criar o admin pelo Swagger.
- **CRUD de clientes** com tela própria, e o formulário de processo passou a usar um
  seletor de clientes no lugar do campo *"ID do Cliente (Banco de Dados)"*.
- **Recuperação de senha por e-mail** — token de uso único, validade de 1 hora,
  hash no banco, limite de 3 pedidos por hora. Envio via Gmail SMTP, com fallback
  que escreve o link no log quando o SMTP não está configurado.
- **Isolamento entre escritórios** corrigido em `/usuarios` e `/clientes`, e as rotas
  de `/escritorios` que estavam abertas sem autenticação foram fechadas.

---

## 🔴 Prioridade alta

### 1. Instalar o Alembic

**Este é o bloqueador de quase tudo abaixo.**

O `alembic` está no `requirements.txt` mas não existe diretório de migrations. O
schema nasce de `models.Base.metadata.create_all()` em `app/main.py`, que **cria
tabelas que faltam mas nunca faz `ALTER`**.

Na prática: qualquer coluna nova em tabela existente simplesmente não aparece no
banco, **sem erro nenhum**. O app sobe e quebra depois, na primeira query que usar
a coluna.

Foi por isso que a recuperação de senha usou uma tabela separada
(`tokens_recuperacao`) em vez de colunas em `usuarios` — funcionou, mas foi um
desvio, não a escolha ideal.

```bash
alembic init alembic
alembic revision --autogenerate -m "estado inicial"
# e remover o create_all do main.py
```

### 2. Link de recuperação aponta para `localhost`

O e-mail chega certo, mas o link é `http://localhost:5173/?token=...`.
`localhost` significa "esta máquina" — então **só funciona no computador onde o
projeto está rodando**. No celular, ou no aparelho de outra pessoa, o link não abre.

Não é bug de código: é configuração. Resolve trocando `FRONTEND_URL` no `.env`.

| Cenário | O que fazer |
|---|---|
| Testar no próprio celular (mesmo Wi-Fi) | `FRONTEND_URL` e `VITE_API_URL` apontando para o IP da máquina na rede (ex.: `http://10.50.27.85:5173` e `:8000`). As **duas** variáveis, senão a tela abre mas não fala com a API. |
| Demonstração pontual para alguém de fora | Túnel: `ngrok http 5173` e usar a URL pública no `FRONTEND_URL` |
| Deixar no ar de verdade | Deploy (Render / Railway / Fly.io têm plano gratuito) |

### 3. Cálculo de prazo em dias corridos

O núcleo do produto está errado. `app/service/prazo_service.py` faz:

```python
return data_publicacao + timedelta(days=dias)
```

No processo civil o **CPC art. 219** manda contar **somente dias úteis**, e o
**art. 224** manda excluir o dia do começo, incluir o do vencimento e prorrogar
quando cair em dia sem expediente. Não há calendário de feriados nem a suspensão
do art. 220 (20/dez a 20/jan).

Um prazo de 15 dias publicado numa sexta vence **21 dias corridos** depois — o
sistema marca 15. Para um sistema que existe para evitar perda de prazo, é a falha
mais séria.

Precisa também distinguir contagem: no processo penal (CPP art. 798) é em dias
corridos. Ou seja, os dois modos, não um só.

**É aqui que teste unitário deixa de ser opcional.**

### 4. Prazo derivado do tipo de processo, não do ato

```python
PRAZOS_POR_TIPO = {"civil": 15, "criminal": 10, ...}
```

Prazo não é propriedade do processo, é do **ato**: contestação 15 dias úteis,
embargos de declaração 5, apelação 15, agravo interno 15. Um mesmo processo civil
tem dezenas de prazos diferentes ao longo da vida — hoje todos nascem com 15 dias.

O `PrazoCreate` nem aceita o tipo do ato, então não há como registrar um prazo de
embargos corretamente.

### 5. Não existe consulta de prazos

O router de prazos só tem `POST`, `PATCH` e `DELETE`. **Não há `GET /prazos/`** —
nem filtro por vencimento, nem por `finalizado=false`, nem "o que vence essa semana".

Para um sistema de gestão de prazos, essa é a consulta central e ela não existe.
Sem ela o dashboard baixa todos os processos e improvisa com `processo.prazos[0]`
(`Dashboard.tsx`), que é o primeiro item de uma lista **sem `order_by`** — pode ser
um prazo já finalizado. Com dois prazos, o card mostra o errado.

---

## 🟡 Prioridade média

### 6. Convite por link no lugar de senha escolhida pelo admin

Hoje o admin digita a senha do advogado no cadastro e passa por fora. O admin
conhece permanentemente a credencial de todo mundo.

Ideia acordada: o admin cadastra sem senha, o sistema gera um link de uso único e
**mostra na tela para copiar** (WhatsApp), com e-mail como opcional. Reaproveita
toda a infraestrutura de token que já existe em `tokens_recuperacao`.

> ⚠️ Convite pode mostrar o link na tela porque **quem recebe é o admin autenticado**.
> Reset self-service **não pode** — quem pede é anônimo, e mostrar o link na tela
> deixaria qualquer um tomar qualquer conta. Por isso o reset exige e-mail.

### 7. Trocar a própria senha estando logado

Não existe endpoint para isso. O advogado fica preso com a senha que o admin
escolheu, para sempre. `PATCH /usuarios/me/senha`, pedindo a senha atual.

### 8. Invalidar o JWT antigo ao trocar a senha

O JWT não tem revogação: um token roubado **continua valendo até expirar** (60 min)
mesmo depois da senha ser trocada. Trocar senha não derruba sessões.

Solução: coluna `senha_alterada_em` em `usuarios`, comparada com o `iat` do token
em `get_current_user`. São ~10 linhas — **mas precisa do Alembic (item 1)**.

### 9. ADMIN não consegue abrir, editar nem excluir processo

`GET /processos/{id}` usa `verificar_acesso_ao_processo`, que só libera o
responsável → ADMIN leva 403 em processo já assumido. E `PATCH`/`DELETE` exigem
perfil `ADVOGADO`.

Ou seja: quem cadastra o processo **não pode corrigir um CNJ digitado errado**.
O dashboard só não quebra porque usa a listagem.

Raiz do problema: `perfil` mistura duas perguntas independentes — *administro o
escritório?* e *sou advogado?*. O sócio de escritório pequeno é os dois.

### ✅ 10. `verificar_acesso_ao_processo` ainda não checava escritório — resolvido em 27/09/2026

`app/utils/autorizacao.py` comparava apenas `responsavel_id`, nunca `escritorio_id`.
Se `responsavel_id is None`, liberava o acesso — o que é o estado normal de um
processo recém-cadastrado ("pool"), não uma exceção.

Confirmado por exploit real (advogado autêntico do escritório B, IDs por
tentativa): `GET`/`PATCH`/`DELETE /processos/{id}` e `POST/PATCH/DELETE
/prazos/{id}` vazavam e permitiam editar/apagar processo (com CPF, endereço e
telefone do cliente aninhados) e prazos sem responsável de qualquer outro
escritório.

**Correção**: `verificar_acesso_ao_processo` agora recebe `escritorio_id` e
responde 404 (nunca 403, pelo mesmo motivo do `_buscar_no_escritorio` em
`clientes.py`) quando o processo não pertence ao escritório de quem pede — antes
de checar `responsavel_id`. Os 8 call-sites em `processos.py` e `prazos.py`
foram atualizados para passar `current_user.escritorio_id`.

Reexecutei o exploit depois da correção: os quatro ataques agora voltam 404
uniforme, e o processo do escritório A permanece intacto.

### 11. Zero testes

Não existe `tests/`, nem `pytest`, nem `httpx` nas dependências. Para CRUD é
defensável; para contagem de prazo não é — é lógica com feriados, fins de semana e
prorrogação, onde o bug não aparece no teste manual porque depende da data em que
você testou.

Começar por: `calcular_data_vencimento` (publicação na sexta, véspera de feriado,
dentro do recesso) e autorização cruzada entre escritórios.

---

## 🟢 Modelagem de dados

Reunidos aqui porque quase todos dependem do Alembic.

### 12. `cnj` é único global

```python
cnj: Mapped[str] = mapped_column(String(30), unique=True, index=True)
```

CNJ é identificador **nacional** — dois escritórios podem estar no mesmo processo
(um pelo autor, outro pelo réu). Hoje o segundo escritório **não consegue
cadastrar**, e falha com 500 porque `IntegrityError` não é tratado.

Correto: `UniqueConstraint("cnj", "escritorio_id")`. Vale deixar nullable também
(processo não distribuído ainda existe). E `String(20)`, não 30 — o validador
força exatamente 20 dígitos.

### 13. Falta a entidade `Movimentacao`

`Prazo.data_publicacao` é o sinal de uma tabela faltando. Publicação/intimação é um
**fato processual próprio**, que acontece uma vez e pode gerar zero, um ou vários
prazos.

Hoje: uma publicação que gera dois prazos duplica a data, e movimentações que não
geram prazo (despacho, juntada — a maioria) não têm onde ser registradas. O
histórico do processo simplesmente não existe.

Cadeia natural: `Processo → Movimentacao → Prazo`. Também é o encaixe óbvio para
integrar com DJEN/Datajud no futuro.

### 14. `Processo → Cliente` é 1:N, mas processo tem polos

Um FK único diz "um processo tem um cliente". Mas há litisconsórcio (4 herdeiros no
mesmo inventário) e é preciso saber se o cliente está no **polo ativo ou passivo** —
é isso que determina quais prazos são seus.

Modelo correto: tabela `processo_partes` com `polo` e `tipo`, permitindo também
registrar a parte contrária que não é cliente.

**É a mudança mais cara da lista**, mas é a que mais separa "CRUD com nomes
jurídicos" de "sistema jurídico".

### 15. `finalizado: bool` apaga o que importa

Um prazo termina de três formas: **cumprido**, **perdido** e **cancelado**. O
booleano colapsa as três.

O histórico de prazos é a prova de diligência do escritório — num processo por
perda de prazo, é o que se apresenta. Um sistema que não distingue "cumpri" de
"perdi" não serve justamente quando mais seria necessário.

Trocar por `status` + `concluido_em` + `concluido_por_id`. E dar responsável próprio
ao prazo, já que prazo se delega.

### 16. `DateTime` onde deveria ser `Date`

Prazo processual é contado **em dias** — não existe "vence às 14h32". A hora não
agrega nada e cria bugs de fuso (publicação às 23h UTC vira o dia seguinte).

Regra: fato jurídico é `Date` (`data_publicacao`, `data_vencimento`); evento de
sistema é `DateTime(timezone=True)` (`criado_em`, `concluido_em`).

Resolve de tabela a esquisitice em `prazo_service.py`:
```python
agora = datetime.now(processo.data_cadastro.tzinfo)  # tzinfo é sempre None
```

### 17. Nenhum FK está indexado

O Postgres **não cria índice automático em foreign key** (só em PK e unique). Não há
índice em `processos.escritorio_id`, `processos.cliente_id`, `prazos.processo_id`,
`usuarios.escritorio_id`, entre outros. Toda listagem faz seq scan.

O índice que mais falta é o da consulta central: `(escritorio_id, status,
data_vencimento)` em `prazos`. Mas `Prazo` **não tem `escritorio_id`** — vale
denormalizar, e é seguro porque processo nunca muda de escritório.

### 18. Fronteira do escritório poderia ser estrutural

Dá para o banco recusar fisicamente um processo apontando para cliente de outro
escritório: `UNIQUE (id, escritorio_id)` em `clientes` e FK composto em `processos`.

É a diferença entre uma regra que você precisa lembrar de checar em toda rota e uma
que não tem como violar.

### 19. Campos de domínio como string livre

`perfil`, `status`, `tipo_processo` são `String` sem enum nem constraint. Um usuário
criado com `perfil="Admin"` (capitalizado) passa na validação e fica **trancado fora
do sistema**, porque `VerificadorPerfil` compara com `"ADMIN"` exato.

> `tipo_pessoa` já foi resolvido em `clientes` (enum na escrita, permissivo na
> leitura para não quebrar registros antigos). Usar o mesmo padrão nos demais.

### 20. Delete em cascata num sistema jurídico

`Escritorio` tem `cascade="all, delete-orphan"` em usuários, clientes e processos —
e processo cascateia em prazos. `DELETE /processos/{id}` apaga de verdade.

Registro de prazo tem obrigação de guarda. Trocar por **soft delete**
(`excluido_em` + filtro) e `ondelete="RESTRICT"` no banco.

### 21. OAB sem UF, cliente sem qualificação

- `oab` é `String(20)` livre. Inscrição real é número **+ seccional** (`123456/CE`).
  Sem a UF não dá para saber onde o advogado pode atuar nem garantir unicidade.
- `endereco` é um `String(255)` único. O **CPC art. 319** exige qualificação completa
  da parte na inicial (nacionalidade, estado civil, profissão, CPF, endereço). Com
  campo livre, o sistema nunca vai conseguir gerar nada.
- Os validadores de CPF/CNPJ conferem só o comprimento — **falta o dígito
  verificador**. Um CPF de onze zeros passa.

---

## 🔵 Higiene

### 22. `package-lock.json` fora de sincronia

`npm ci` falha (`@emnapi/core` faltando no lock). O `frontend/Dockerfile` usa
`npm install`, então o fluxo Docker não quebra — mas quebraria em CI. Um `npm install`
local e commit do lock resolve.

### 23. `.gitignore` não cobre `.env.*`

Cobre `.env` e `.env.local`, mas não `.env.backup-*`. Backups do `.env` contêm a
senha de app do Gmail e **não estão ignorados**. Trocar por `.env*` com
`!.env.example`.

### 24. Imagem Docker é de desenvolvimento

`--reload` está fixo no `CMD` do `Dockerfile`, e o compose monta `.:/app` por cima
da imagem — incluindo o `.venv` do host, com binários de macOS num container Linux.
Não há build de produção nem `--workers`.

### 25. Editar cliente na tela

`PATCH /clientes/{id}` já existe na API, mas não há botão de editar na interface.
Telefone e e-mail de cliente mudam com frequência.

### 26. Dados de teste no banco local

Sobraram vários escritórios e clientes fictícios criados durante os testes
(`demo.reset@argus.br`, `a15631@a.adv.br`, "Escritorio A/B"...). Limpar antes de
apresentar, ou zerar com `docker compose down -v` e recriar a conta pela tela.

---

## Referência rápida

```bash
# subir tudo
docker compose up -d

# entrar no banco
docker exec -it argus_postgres_db psql -U postgres -d argus_legis

# ver o link de recuperação quando o SMTP não estiver configurado
docker compose logs app | grep 'token='
```

**Configuração de e-mail** (`.env`): `SMTP_USER` é o Gmail e `SMTP_PASSWORD` é uma
*senha de app* de 16 caracteres gerada em https://myaccount.google.com/apppasswords
(exige verificação em duas etapas). **Colar sem os espaços** que o Google exibe —
foi exatamente esse o erro na primeira tentativa.
