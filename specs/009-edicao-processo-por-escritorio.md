# Spec 009: Edição de processo presa ao escritório
**Status:** Aprovada   **Data:** 2026-10-24
**Relacionadas:** issue #88 · [Spec 008 — CNJ único por escritório](008-cnj-por-escritorio.md) (mexe na mesma rota)

## 1. Contexto
- **Como funciona hoje:** o `PATCH /processos/{id}` (`app/routes/processos.py:123`) só aceita ADVOGADO e chama `verificar_acesso_ao_processo` (processo do mesmo escritório; se tiver responsável, só ele edita). Depois aplica com `setattr` todos os campos do `ProcessoUpdate` (`app/schemas/processo.py:46`): `cnj`, `titulo`, `tribunal`, `tipo_processo`, `cliente_id`, `responsavel_id` e `escritorio_id`. Nenhum dos três ids é conferido. A tela só usa essa rota para **assumir** (`Dashboard.tsx:371`, manda `responsavel_id` = o próprio advogado).
- **Problema observado:** achado do Pedreiro durante a #87 (22/10). Pela API, um advogado consegue:
  - mandar `escritorio_id` de outro escritório e **mover o processo** para lá;
  - mandar `cliente_id` de um **cliente de outro escritório** (o cadastro já bloqueia isso, `processos.py:25`);
  - mandar `responsavel_id` de **qualquer usuário**, de outro escritório ou ADMIN.

## 2. Objetivo
- **O que fazer:** a edição não troca mais o escritório, e só aceita cliente e responsável do mesmo escritório do usuário (responsável tem que ser ADVOGADO).
- **Por que fazer:** fechar a última porta pela qual dado de um escritório passa para outro.

## 3. Decisões
- **Decidido:** tirar `escritorio_id` do `ProcessoUpdate` — **porque** processo nunca muda de escritório; sem o campo, o Pydantic ignora se vier, e a tela não usa.
- **Decidido:** `cliente_id` precisa ser de cliente do mesmo escritório, senão **404 "Cliente não encontrado neste escritório."** — **porque** é a mesma regra e a mesma mensagem do cadastro.
- **Decidido:** `responsavel_id` com valor precisa ser **ADVOGADO do mesmo escritório**, senão **404 "Advogado não encontrado neste escritório."** — **porque** só advogado assume processo, e passar para um colega do escritório continua possível.
- **Decidido:** `responsavel_id: null` continua aceito — **porque** só quem já pode editar (o responsável, ou qualquer advogado se estiver na piscina) chega aqui.
- **Decidido:** 404 e não 403 — **porque** é a regra do `app/utils/autorizacao.py`: id de outro escritório tem que parecer inexistente, para não dar para descobrir por tentativa.
- **Descartado:** responsável só pode ser o próprio advogado — **porque** fecha a porta de passar o processo a um colega.
- **Descartado:** rota própria de "assumir" e PATCH só com dados do processo — **porque** muda frontend e duas rotas, maior que a issue.

## 4. Escopo
- **Arquivos a alterar** (só backend — Pedreiro):
  - `app/schemas/processo.py` — tirar `escritorio_id` do `ProcessoUpdate`;
  - `app/routes/processos.py` — checagens de `cliente_id` e `responsavel_id` no `atualizar_processo`, depois da checagem de CNJ.
- **Fora de escopo:** frontend; o `escritorio_id` do `ProcessoCreate` (o cadastro já ignora e usa o do usuário); permissões de quem pode editar; migration (não muda banco).
- **Restrições (não pode quebrar):** assumir pela tela; liberar; checagem de CNJ da Spec 008; recálculo do prazo ao trocar `tipo_processo`.

## 5. Diretrizes Técnicas
- `cliente_id`: se a chave vier no `dados_dict`, buscar `models.Cliente` com `id == dados_dict["cliente_id"]` e `escritorio_id == current_user.escritorio_id`; sem resultado → 404. `cliente_id: null` cai no mesmo 404 (hoje daria 500, a coluna não aceita vazio).
- `responsavel_id`: se vier com valor, buscar `models.Usuario` com `id`, `escritorio_id == current_user.escritorio_id` e `perfil == "ADVOGADO"`; sem resultado → 404.
- Código no estilo da checagem de cliente do `criar_processo`, sem função nova.
- **Casos de borda:**
  - assumir pela tela (`responsavel_id` = o próprio advogado) → 200;
  - passar para outro advogado do mesmo escritório → 200;
  - responsável = ADMIN do mesmo escritório → 404;
  - responsável = advogado de outro escritório → 404;
  - `escritorio_id` de outro escritório no corpo → 200, mas o processo continua no escritório dele;
  - `cliente_id` de outro escritório → 404 e nada muda no processo.

## 6. Etapas de Implementação
1. Tirar `escritorio_id` do `ProcessoUpdate` → PATCH com `escritorio_id: 14` devolve 200 e o processo continua no escritório 13.
2. Checagem de `cliente_id` → PATCH com cliente do B devolve 404.
3. Checagem de `responsavel_id` → PATCH com advogado do B ou admin do A devolve 404; com ele mesmo, 200.
4. Rodar os testes da seção 8.

## 7. Critérios de Aceite
- [x] Dado o processo #35 (escritório 13), quando o advogado do A (`adv87.a.5765@exemplo.com`) manda `{"escritorio_id": 14}`, então recebe 200 e o processo continua com `escritorio_id` 13.
- [x] Dado o mesmo processo, quando o advogado do A manda o `cliente_id` do cliente do escritório 14, então recebe 404 "Cliente não encontrado neste escritório." e o cliente do processo não muda.
- [x] Dado o mesmo processo, quando o advogado do A manda o `cliente_id` de um cliente do escritório 13, então recebe 200.
- [x] Dado o mesmo processo, quando o advogado do A manda `responsavel_id` = id do advogado do B (20), então recebe 404 "Advogado não encontrado neste escritório.".
- [x] Dado o mesmo processo, quando o advogado do A manda `responsavel_id` = id do admin do A (17), então recebe 404.
- [x] Dado o mesmo processo, quando o advogado do A manda `responsavel_id` = o próprio id (18), então recebe 200 e passa a ser o responsável.

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é pela API (script) e pela tela.
### Manual
- [x] **Ação:** os 6 casos da seção 7 pela API, com os escritórios Teste87 13 e 14 (admins `teste87.a/b.5765@exemplo.com`, advogados `adv87.a/b.5765@exemplo.com`, senha `senha12345`) → **Esperado:** como na seção 7.
- [ ] **Ação (Testador, tela):** ADVOGADO da "Conta de teste" assume o processo #24 (piscina) e depois libera → **Esperado:** os dois funcionam como antes; no fim o #24 volta para a piscina.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
