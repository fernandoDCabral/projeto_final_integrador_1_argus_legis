# Spec 008: CNJ único por escritório
**Status:** Aprovada   **Data:** 2026-10-22
**Relacionadas:** issue #87 (Sprint 5)

## 1. Contexto
- **Como funciona hoje:** ao cadastrar um processo (`POST /processos/`, `app/routes/processos.py:39`) e ao editar (`PATCH /processos/{id}`, linha 141), a checagem de CNJ duplicado busca em **todos** os processos do sistema, sem filtrar por `escritorio_id`, e devolve 409 com o título do processo achado. No banco, `processos.cnj` é `unique=True` na tabela toda (índice único `ix_processos_cnj`, migration `e21573803985`). O cliente já faz do jeito certo: a checagem de CPF/CNPJ filtra pelo escritório (`app/routes/clientes.py:49`).
- **Problema observado:** issue #87. Reproduzido em 22/10 pela API: o escritório A cadastrou o CNJ `1627880-16.2024.8.06.0001` com o título "Processo SIGILOSO do escritorio A"; o escritório B, ao cadastrar o mesmo CNJ, recebeu **409 "Já existe um processo com este CNJ: Processo SIGILOSO do escritorio A."**. Ou seja:
  - vaza o título de um processo de outro escritório;
  - dois escritórios que atuam no mesmo processo não conseguem cadastrá-lo.

## 2. Objetivo
- **O que fazer:** o CNJ passa a ser único **dentro de cada escritório**: na checagem do cadastro e da edição e na regra do banco.
- **Por que fazer:** acabar com o vazamento de dado entre escritórios e permitir que escritórios diferentes cadastrem o mesmo processo.

## 3. Decisões
- **Decidido:** checagem filtrada por `escritorio_id` + regra única no banco no par (`escritorio_id`, `cnj`) — **porque** resolve o vazamento e o bloqueio, e o banco continua garantindo que o mesmo escritório não tenha o CNJ repetido, mesmo com requisição feita fora da tela.
- **Decidido:** corrigir também a checagem da **edição** — **porque** é o mesmo vazamento por outra porta (pela API, um advogado do B troca o CNJ para um que o A tem e vê o título do A).
- **Decidido:** a mensagem de erro continua "Já existe um processo com este CNJ: {título}." — **porque**, com o filtro, o título é sempre do próprio escritório e ajuda o usuário a achar o repetido.
- **Decidido:** manter o `index=True` no `cnj` — **porque** a busca da listagem filtra por CNJ.
- **Descartado:** filtrar por escritório e só apagar a regra do banco (igual ao cliente) — **porque** duas requisições ao mesmo tempo poderiam criar o mesmo CNJ duas vezes no mesmo escritório.
- **Descartado:** processo compartilhado entre vários escritórios — **porque** muda o modelo inteiro (responsável, prazos, peças); grande demais para a issue.
- **Descartado:** tratar o `IntegrityError` (erro 500) do clique duplo — **porque** já acontece hoje, é raro e deixaria o código mais complexo sem necessidade agora.

## 4. Escopo
- **Arquivos a alterar/criar** (só backend — Pedreiro):
  - `app/routes/processos.py` — filtro nas duas checagens e ajuste do comentário "único globalmente" (linha ~35);
  - `app/models/processo.py` — tirar `unique=True` do `cnj` e adicionar `__table_args__` com `UniqueConstraint("escritorio_id", "cnj", name="uq_processos_escritorio_cnj")`;
  - nova migration `alembic/versions/..._cnj_unico_por_escritorio.py` (`down_revision = "f6a7b8c9d0e1"`).
- **Fora de escopo:** frontend (já mostra o `detail` do 409); processo compartilhado entre escritórios; erro 500 do clique duplo; editar CNJ pela tela (hoje a tela só manda `responsavel_id` no PATCH).
- **Restrições (não pode quebrar):** listagem e busca por CNJ; consulta ao DataJud; liberar/assumir processo; processos sem CNJ (`NULL`) continuam permitidos em qualquer quantidade; regras de acesso da edição (só ADVOGADO; se tem responsável, só ele).

## 5. Diretrizes Técnicas
- **Cadastro:** acrescentar `models.Processo.escritorio_id == current_user.escritorio_id` no filtro do `duplicado`.
- **Edição:** acrescentar o mesmo filtro, mantendo o `models.Processo.id != processo_id`.
- **Migration:**
  - `upgrade`: `op.drop_index("ix_processos_cnj", table_name="processos")`, `op.create_index("ix_processos_cnj", "processos", ["cnj"], unique=False)`, `op.create_unique_constraint("uq_processos_escritorio_cnj", "processos", ["escritorio_id", "cnj"])`;
  - `downgrade`: o inverso. Comentário avisando que só funciona se nenhum CNJ estiver repetido entre escritórios.
  - Os dados atuais não atrapalham: hoje o CNJ já é único no sistema inteiro.
- **Casos de borda:**
  - mesmo CNJ em escritórios diferentes → permitido;
  - mesmo CNJ duas vezes no mesmo escritório → 409 com o título do próprio escritório;
  - editar mantendo o próprio CNJ → permitido;
  - editar para um CNJ que só outro escritório tem → permitido, sem mostrar título alheio;
  - vários processos sem CNJ no mesmo escritório → permitido (o Postgres não compara `NULL` com `NULL` na regra única);
  - clique duplo no mesmo escritório → o banco barra a segunda (500), igual a hoje.

## 6. Etapas de Implementação
1. Filtro por escritório nas duas checagens de `app/routes/processos.py` → o B ainda não consegue cadastrar o CNJ do A (o banco barra e dá 500), mas a resposta já não mostra o título do A.
2. Ajustar `app/models/processo.py` e criar a migration → `alembic upgrade head` roda sem erro e `\d processos` mostra `uq_processos_escritorio_cnj` e `ix_processos_cnj` sem único.
3. Testar `alembic downgrade -1` e `upgrade head` de novo → os dois funcionam.
4. Rodar os testes da seção 8 pela API.

## 7. Critérios de Aceite
- [x] Dado que o escritório A tem um processo com o CNJ `1627880-16.2024.8.06.0001`, quando o admin do escritório B cadastra o mesmo CNJ, então recebe **200** e o processo é criado no B.
- [x] Dado que o escritório A tem um processo com o CNJ X, quando o admin do A cadastra o CNJ X de novo, então recebe **409** "Já existe um processo com este CNJ: {título do processo do A}.".
- [x] Dado que o CNJ Z existe só no escritório A, quando o advogado do B edita um processo do B para o CNJ Z, então recebe **200**.
- [x] Dado que o escritório A tem os processos X e W, quando o advogado do A edita o W para o CNJ do X, então recebe **409** com o título do processo X do A.
- [x] Dado um escritório com dois processos sem CNJ, quando a migration roda, então nada quebra e os dois continuam lá.
- [x] Em nenhuma resposta de erro aparece título de processo de outro escritório.

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é pela API (script) e pela tela.
### Manual
- [x] **Preparação:** dois escritórios (A e B), cada um com um cliente e um ADVOGADO criado pelo admin (`POST /usuarios/`). Podem ser os "Teste87 Escritorio A/B" já criados em 22/10.
- [x] **Ação:** admin do A cadastra o CNJ X → **Esperado:** 200.
- [x] **Ação:** admin do B cadastra o CNJ X → **Esperado:** 200 (antes dava 409 com o título do A).
- [x] **Ação:** admin do A cadastra o CNJ X de novo → **Esperado:** 409 com o título do processo do próprio A.
- [x] **Ação:** admin do B cadastra o CNJ Y; advogado do B edita esse processo para o CNJ Z, que só o A tem → **Esperado:** 200.
- [x] **Ação:** admin do A cadastra os CNJs X e W; advogado do A edita o W para o CNJ X → **Esperado:** 409 com o título do X do A.
- [x] **Ação:** `alembic upgrade head`, `\d processos`, `alembic downgrade -1`, `alembic upgrade head` → **Esperado:** tudo sem erro; regra `uq_processos_escritorio_cnj` presente no fim.
- [ ] **Ação (Testador, tela):** entrar como admin do Teste87 B e cadastrar o CNJ que o A já tem → **Esperado:** cadastro feito e nenhum título do A aparece.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
