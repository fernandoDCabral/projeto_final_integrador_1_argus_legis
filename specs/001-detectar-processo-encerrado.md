# Spec 001: Detectar processo encerrado
**Status:** Implementada   **Data:** 2026-09-30
**Relacionadas:** Spec 002 (revisão da contagem de prazos — depende desta)

## 1. Contexto
- **Como funciona hoje:**
  - `processos.status` é texto livre: nasce `"Ativo"` (`app/schemas/processo.py:21`) e nunca muda sozinho. O sistema não tem como saber que um processo acabou.
  - O cadastro aceita processo sem CNJ e processo que o DataJud não encontrou. No modal, o botão "🔎 Buscar no DataJud" é opcional e o "Cadastrar Processo" fica sempre habilitado (`frontend/src/pages/Dashboard.tsx:279-339`): dá para cadastrar sem buscar, ou ver "não encontrado" e cadastrar mesmo assim. O `GET /datajud/{cnj}` só devolve dados; o `POST /processos/` grava o que receber, sem saber se houve busca.
  - `consultar_processo` (`app/service/datajud_service.py:221`) usa só o registro do DataJud atualizado mais recentemente, mesmo quando o CNJ vem em mais de um registro (um por grau).
  - Todo processo continua contando prazo para sempre: `prazo_estimado` a partir da última publicação achada e o "Prazo Inicial" de 10 dias úteis criado no cadastro.
- **Problema observado:** o processo `3000282-51.2024.8.06.0018` (4ª Unidade do JEC de Fortaleza, ajuizado em 21/03/2024) terminou em acordo:
  ```
  2024-10-21  466  Homologação de Transação
  2024-10-23  848  Trânsito em julgado
  2024-10-23  246  Arquivamento Definitivo
  ```
  Mesmo assim, o sistema calcula prazo a partir da publicação de 13/05/2024 e o mostra na piscina como "Vencido há ~850 dias (estimado)", número que cresce todo dia.

## 2. Objetivo
- **O que fazer:** a partir das movimentações do DataJud, descobrir se o processo foi encerrado de vez e guardar isso (`status = "Encerrado"` + data). Processo encerrado sai da piscina e de "Meus Processos Ativos". E só entra no sistema processo que o DataJud encontra.
- **Por que fazer:** sem saber que o processo terminou, qualquer regra de prazo continua contando prazo de processo morto. Esta é a base da Spec 002.

## 3. Decisões
- **Decidido:** processo encerrado = o último movimento **246 (Arquivamento Definitivo)** é mais recente que o último **849 (Reativação)** e o último **893 (Desarquivamento)**. A data de encerramento é a data desse 246 — **porque** nos dados reais o 246 é o que marca o fim, e já vimos processos do TJCE arquivados em 11/08/2026 e reativados depois (849) para cumprimento de sentença.
- **Decidido:** olhar só os registros de **1º grau ou Juizado Especial** (`grau` G1 ou JE) para decidir — **porque** no 2º grau o arquivamento/baixa só devolve o processo para a origem, que continua andando.
- **Decidido:** CNJ que o DataJud não encontra **não é cadastrado**, e a tela só mostra "não encontrado" — **porque** tudo no sistema depende dos dados do DataJud; não faz sentido manter um processo que a API não acha. Consequência: o CNJ passa a ser **obrigatório** no cadastro.
- **Decidido:** quem trava é a **tela** — o botão "Cadastrar Processo" só habilita depois de uma busca **com sucesso** para o CNJ digitado (se o CNJ for alterado, trava de novo). O backend não reconsulta — **porque** é a mudança mais simples, faz uma consulta só ao DataJud e não grava nada antes do clique em "Cadastrar"; se o advogado desistir, não sobra nada no banco.
- **Descartado:** backend consultar o DataJud de novo dentro do `POST /processos/` — **porque** são duas consultas para o mesmo processo, e o cadastro falharia sempre que o DataJud travasse na segunda.
- **Descartado (por enquanto):** guardar a consulta no banco para o `POST` conferir — **porque** deixaria registro sobrando quando o advogado desiste do cadastro.
- **Descartado (por enquanto):** "comprovante" assinado com a `SECRET_KEY` devolvido pelo `GET /datajud` e conferido no `POST` — **porque** a opção da tela já resolve o uso normal. Fica como melhoria: hoje quem chama a API direto (Postman, `/docs`) ainda consegue cadastrar um CNJ que o DataJud não achou.
- **Decidido:** guardar em `status` com valores fixos (`"Ativo"` / `"Encerrado"`) + coluna nova `encerrado_em` (date) — **porque** `status` já existe, já aparece na tela e já tem filtro no `GET /processos/`.
- **Decidido:** checar só nos dois momentos em que o DataJud já é consultado: no cadastro e no botão "Atualizar DataJud" (`POST /processos/{id}/datajud`) — **porque** é simples e não precisa de rotina agendada.
- **Decidido:** `status` deixa de ser editável à mão — **porque** ele passa a vir só do DataJud.
- **Decidido:** processo que já está encerrado na hora do cadastro **é cadastrado** como `Encerrado` — **porque** serve de histórico do cliente; ele só não vai para a piscina.
- **Decidido:** processos que já estão no banco **ficam como estão**, sem script de correção — **porque** os encerrados são detectados quando alguém clicar em "Atualizar DataJud", e os sem CNJ ou que o DataJud não acha não justificam uma limpeza agora.
- **Descartado:** marcar "Encerrado" manualmente — **porque** processo que a API não acha nem entra no sistema.
- **Descartado:** considerar encerrado pelo **848 (Trânsito em julgado)** — **porque** depois dele ainda pode vir a execução/cumprimento de sentença.
- **Descartado:** considerar encerrado pelo **22 (Baixa Definitiva)** — **porque** no TRF1 ele aparece no 2º grau quando o recurso volta para a origem, e há processo com movimento novo depois dele.
- **Descartado:** rotina automática que consulta todos os processos de tempos em tempos — **porque** aumenta a carga num DataJud que já dá timeout e 429; fica para depois, se precisar.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/service/datajud_service.py` — calcular `encerrado_em` olhando os registros G1/JE e devolvê-lo na consulta.
  - `app/schemas/datajud.py` — campo `encerrado_em` na resposta da consulta.
  - `app/models/processo.py` — coluna `encerrado_em`.
  - `alembic/versions/<nova>.py` — migration da coluna `encerrado_em`.
  - `app/schemas/processo.py` — `cnj` obrigatório no `ProcessoCreate`; `encerrado_em` no `ProcessoCreate` (vem da busca) e na resposta; `status` fora do `ProcessoUpdate`.
  - `app/routes/processos.py` — no cadastro, `status = "Encerrado"` quando vier `encerrado_em`, senão `"Ativo"`; no "Atualizar DataJud", gravar `status`/`encerrado_em`.
  - `frontend/src/pages/Dashboard.tsx` — "Cadastrar Processo" só habilita com busca de sucesso; enviar `encerrado_em` no cadastro; tirar encerrados da piscina e de "Meus Processos Ativos"; selo cinza "Encerrado em dd/mm/aaaa".
  - `frontend/src/types/datajud.ts` — campo `encerrado_em`.
- **Fora de escopo:**
  - O que acontece com os prazos de um processo encerrado (parar de contar, finalizar) → Spec 002.
  - Prazo Inicial de 10 dias úteis e `prazo_estimado` → Spec 002.
  - Arquivamento provisório (245) / status "Suspenso".
  - Processos que já estão no banco: nada de script nem migration de dados. Os sem CNJ ou que o DataJud não acha continuam como estão; os encerrados só mudam quando alguém clicar em "Atualizar DataJud".
  - Fluxo do "Prazo Inicial" da petição (perde o sentido com CNJ obrigatório) → Spec 002.
  - Endpoint `GET /processos/{id}/prazo-movimentacao`.
  - Rotina automática de atualização.
- **Restrições (não pode quebrar):**
  - Formato atual do `GET /datajud/{cnj}` e do `ProcessoResponse` (só ganham campos novos).
  - Mensagens de erro atuais do DataJud (422 CNJ inválido, 404 não encontrado, 502 indisponível).
  - Isolamento entre escritórios (`verificar_acesso_ao_processo`).
  - Migrations do Alembic (nada de `create_all`).

## 5. Diretrizes Técnicas
- Seguir o estilo do projeto: código direto, sem abstração extra.
- Constantes junto das outras do `datajud_service.py`: `CODIGO_ARQUIVAMENTO_DEFINITIVO = 246`, `CODIGO_REATIVACAO = 849`, `CODIGO_DESARQUIVAMENTO = 893`.
- A conta do encerramento usa as movimentações de **todos** os registros G1/JE do CNJ, não só o registro escolhido para a tela.
- Comparar pela data/hora do movimento (`momento`), não pela ordem da lista.
- **Casos de borda:**
  - Nenhum registro G1/JE (só 2º grau) → não dá para afirmar → `Ativo`.
  - 246 e 849 no mesmo dia → vale o que tiver horário mais tarde; se os dois vierem sem horário, fica `Ativo` (na dúvida, não esconder o processo).
  - Processo encerrado que é reativado depois → no próximo "Atualizar DataJud" volta para `Ativo` e `encerrado_em = null`, e reaparece na piscina ou em "Meus processos".
  - DataJud fora do ar (timeout/429/502) na busca do cadastro → mostra a mensagem atual de indisponível e o botão "Cadastrar" continua travado.
  - Busca com sucesso e depois o CNJ é editado → o resultado some (já acontece hoje) e o botão trava de novo.
  - DataJud fora do ar no "Atualizar DataJud" → não mexe em `status` nem `encerrado_em`.
  - CNJ já cadastrado → continua o 409 atual.

## 6. Etapas de Implementação
1. Migration + coluna `encerrado_em` no model. → `alembic upgrade head` roda e a coluna aparece no Postgres.
2. Cálculo do `encerrado_em` no `datajud_service.py` e campo na resposta. → `GET /datajud/30002825120248060018` devolve `"encerrado_em": "2024-10-23"`.
3. Cadastro no backend: CNJ obrigatório; grava `status`/`encerrado_em` a partir do `encerrado_em` recebido. → `POST /processos/` sem CNJ devolve 422; com `encerrado_em` grava `Encerrado`.
4. "Atualizar DataJud" grava `status`/`encerrado_em`. → processo de teste muda para `Encerrado` depois de clicar.
5. `status` fora do `ProcessoUpdate`. → `PATCH` com `status` não altera nada.
6. Frontend: botão "Cadastrar" travado até a busca dar certo; `encerrado_em` no envio; filtros da piscina e de "Meus Processos Ativos"; selo cinza. → conferir na tela.

## 7. Critérios de Aceite
- [x] Dado o CNJ `3000282-51.2024.8.06.0018`, quando consulto o DataJud, então a resposta traz `encerrado_em = 2024-10-23`. *(API: 200, `encerrado_em = 2024-10-23`)*
- [x] Dado esse CNJ, quando cadastro o processo, então ele é gravado com `status = "Encerrado"` e `encerrado_em = 2024-10-23` e **não** aparece na piscina. *(Esse CNJ já existe no escritório 1. Testado pela API no escritório de teste com `30032588320258060151`: gravou `Encerrado`, `encerrado_em = 2026-08-13`. Conferido na tela pelo Savio: não aparece na piscina.)*
- [x] Dado um processo com 246 seguido de 849 (ex.: TJCE `30032865120258060151`), quando consulto, então ele fica `Ativo` e `encerrado_em = null`. *(API: consulta e cadastro devolveram `Ativo`, `encerrado_em = null`)*
- [x] Dado um CNJ que não existe (ex.: `0000001-72.2099.8.06.0001`), quando busco no modal, então aparece "Processo não encontrado no DataJud" e o botão "Cadastrar Processo" continua desabilitado. *(API: 404 confirmado. Botão conferido na tela pelo Savio. Desvio: o exemplo original `0000832-35.2018.4.01.3202` existe no DataJud — ver nota abaixo.)*
- [x] Dado o modal aberto sem ter buscado, então o botão "Cadastrar Processo" está desabilitado.
- [x] Dado um cadastro sem CNJ, quando envio, então a API recusa (422). *(API: 422, `body.cnj: Field required`)*
- [x] Dado um processo encerrado com responsável, quando abro "Meus Processos Ativos", então ele não aparece; na tela de processos ele aparece com o selo "Encerrado em 23/10/2024".
- [x] Dado o DataJud fora do ar, quando clico em "Atualizar DataJud", então `status` e `encerrado_em` continuam como estavam. *(Processo 2: `POST /processos/2/datajud` deu 200 e depois 502; no banco continuou `Encerrado`, `2020-11-12`.)*

> **Nota (implementação, 30/09/2026):** o exemplo `0000832-35.2018.4.01.3202` **existe** no DataJud (TRF1, JEF de Tefé). O "0 registros" da investigação foi uma resposta falha da API. Consultado de novo, ele volta com `encerrado_em = 2020-11-12` (246 às 17:27): é mais um processo encerrado que contava prazo. Consequência: o DataJud às vezes devolve vazio para processo que existe, e a tela mostra "não encontrado" — buscar de novo resolve.

> **Processos reais (30/09/2026):** "Atualizar DataJud" pela tela nos processos 2 (`0000832-35.2018.4.01.3202`) e 3 (`3000282-51.2024.8.06.0018`) do escritório 1 → `Encerrado` em `2020-11-12` e `2024-10-23`.

## 8. Testes e Validação
### Automatizados
- [x] O projeto **ainda não tem** pasta `tests/` nem suíte automatizada. Esta spec não cria uma; a validação é manual (abaixo).
### Manual
- [x] **Ação:** `alembic upgrade head` no container da API → **Esperado:** migration aplicada sem erro; coluna `encerrado_em` existe.
- [x] **Ação:** `GET /datajud/30002825120248060018` → **Esperado:** `encerrado_em: "2024-10-23"`.
- [x] **Ação:** `GET /datajud/30032865120258060151` → **Esperado:** `encerrado_em: null`.
- [x] **Ação:** cadastrar `3000282-51.2024.8.06.0018` pela tela → **Esperado:** cadastra, não vai para a piscina, aparece na tela de processos com o selo cinza.
- [x] **Ação:** buscar `0000001-72.2099.8.06.0001` no modal → **Esperado:** mensagem de não encontrado e botão "Cadastrar" desabilitado.
- [x] **Ação:** buscar `3000282-51.2024.8.06.0018` com sucesso e depois apagar um dígito do CNJ → **Esperado:** botão "Cadastrar" volta a ficar desabilitado.
- [x] **Ação:** `POST /processos/` pelo `/docs` sem `cnj` → **Esperado:** 422.
- [x] **Ação:** `PATCH /processos/{id}` com `{"status": "Ativo"}` num encerrado → **Esperado:** status não muda. *(200, continuou `Encerrado`)*

## 9. Perguntas em Aberto
- Nenhuma no momento.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
