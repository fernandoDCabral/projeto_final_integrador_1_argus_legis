# Spec 002: Revisão da contagem de prazos
**Status:** Implementada   **Data:** 2026-10-02
**Relacionadas:** Spec 001 (detectar processo encerrado — base desta)

## 1. Contexto
- **Como funciona hoje:**
  - **Prazo Inicial:** todo cadastro cria um prazo "interno" de 10 dias úteis contados da **data de cadastro** (`app/routes/processos.py:69-73`, `prazo_service.calcular_data_vencimento_interno`). Ele foi pensado para redigir a petição inicial de um processo ainda sem CNJ. Desde a Spec 001 todo processo tem CNJ, ou seja, **já foi ajuizado** — esse prazo não corresponde a nenhuma intimação.
  - `POST /prazos/` sem `data_publicacao` também cria prazo interno, e `PATCH /prazos/{id}` com `data_publicacao = null` volta o prazo para interno (`prazo_service.py:150-201`).
  - **Assumir** (`Dashboard.tsx:168-195`): se o processo não tem prazo, cria um; se tem, edita o `prazos[0]` com a data de publicação informada.
  - **Prazo estimado** (`processos.prazo_estimado`): calculado a partir da última publicação achada no DataJud, mesmo para processo encerrado e mesmo para publicação de anos atrás. Na piscina, estimativa vencida aparece para sempre como "Vencido há N dias (estimado)": vermelho, ou laranja se houve petição depois da publicação (`Dashboard.tsx:1052-1060`).
  - `GET /processos/{id}/prazo-movimentacao` conta **dias corridos** a partir do cadastro, ignorando feriados e publicação. Ninguém usa (o frontend não chama).
- **Problema observado (banco em 02/10/2026):**
  - Processo 1 (`0258150-42.2023.8.06.0001`, de 2023, ativo): Prazo Inicial interno **vence em 05/10/2026** sem nenhuma intimação nova.
  - 10 prazos internos sem publicação no banco (5 no escritório 1: prazos 1, 2, 8, 12, 13), todos contando da data de cadastro.
  - Processo 1 também tem estimativa vencida em 08/07/2026 — vai aparecer como "Vencido há ~90 dias" para sempre.

## 2. Objetivo
- **O que fazer:** prazo só nasce de uma publicação; a estimativa do DataJud só chama atenção enquanto faz sentido (até 30 dias depois de vencida); processo encerrado não calcula prazo; os prazos internos que já existem saem da contagem.
- **Por que fazer:** prazo processual começa com uma intimação/publicação, não com o dia em que o escritório digitou o processo. Alarme falso faz o advogado parar de confiar nos alarmes de verdade.

## 3. Decisões
- **Decidido:** o cadastro **não cria mais prazo** — **porque** com CNJ obrigatório o processo já foi ajuizado e não existe "petição inicial" a redigir.
- **Decidido:** prazo só existe com `data_publicacao`: `POST /prazos/` exige a data (422 sem ela) e `PATCH /prazos/{id}` não aceita trocar a data por `null` (400) — **porque** sem publicação não há de onde contar.
- **Decidido:** ao **assumir**, se o advogado informar a data da publicação (já vem sugerida pelo DataJud), **sempre cria um prazo novo**; sem data, o processo fica sem prazo e aparece **"Sem prazo aberto"** em cinza — **porque** editar o `prazos[0]` reaproveitaria um Prazo Inicial antigo finalizado.
- **Decidido:** prazos internos sem publicação que já estão no banco são **finalizados** (`finalizado = true`) por uma migration de dados — **porque** tira o alarme falso já e não apaga nada.
- **Decidido:** a coluna `prazos.interno` **fica** — **porque** identifica os prazos antigos no histórico; só deixa de ser criada como `true`.
- **Decidido:** estimativa vencida na piscina e na prévia:
  - até **30 dias** depois de vencida, sem petição depois da publicação → **vermelho** "Vencido há N dias (estimado)" (como hoje);
  - até **30 dias**, com petição depois da publicação → **laranja** + "pode já ter sido respondida" (como hoje);
  - **mais de 30 dias** → **cinza** "Sem prazo em aberto (última publicação em dd/mm/aaaa)".
  **Porque** nos primeiros 30 dias um prazo perdido ainda pode ter remédio e o advogado precisa conferir; depois disso o alarme só faz ruído.
- **Decidido:** processo **encerrado** fica com `prazo_estimado = null` (no cadastro, no "Atualizar DataJud" e ao trocar o tipo) — **porque** não há prazo a cumprir. Os prazos já cadastrados dele não são apagados nem finalizados; só não aparecem como contando (a Spec 001 já esconde o processo). Se for reativado, voltam a aparecer.
- **Decidido:** remover `GET /processos/{id}/prazo-movimentacao`, `prazo_service.calcular_prazo_movimentacao` e `ProcessoPrazoMovimentacaoResponse` — **porque** é uma conta errada (dias corridos do cadastro) que ninguém usa.
- **Descartado:** apagar os prazos internos antigos — **porque** não tem volta.
- **Descartado:** deixar os prazos internos antigos como estão — **porque** o processo 1 avisaria "vence em 3 dias" sem motivo.
- **Descartado:** cinza "Provavelmente respondido" quando há petição depois da publicação — **porque** a petição é indício, não prova; nos primeiros 30 dias é melhor o advogado conferir.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/routes/processos.py` — cadastro sem Prazo Inicial; `prazo_estimado = null` para encerrado; remover a rota `prazo-movimentacao`.
  - `app/service/prazo_service.py` — `criar_prazo`/`atualizar_prazo` sem o caminho interno; remover `calcular_data_vencimento_interno`, `PRAZO_PETICAO_INICIAL_DIAS`, `calcular_prazo_movimentacao` e o que ficar sem uso (`_data_local`).
  - `app/schemas/prazo.py` — `data_publicacao` obrigatória no `PrazoCreate`; comentários do prazo interno.
  - `app/schemas/processo.py` / `app/schemas/__init__.py` — remover `ProcessoPrazoMovimentacaoResponse`.
  - `alembic/versions/<nova>.py` — migration de dados que finaliza `interno = true AND data_publicacao IS NULL`.
  - `frontend/src/pages/Dashboard.tsx` — assumir sempre cria prazo novo (com data) ou nenhum; badge da piscina e da prévia com a regra dos 30 dias; "Sem prazo aberto"; tirar os textos de "prazo inicial".
- **Fora de escopo:**
  - Prazo por tipo de ato (item 4 do `MELHORIAS.md`) — spec própria.
  - Mensagens "preencha os dados manualmente" do DataJud.
  - PATCH trocando o CNJ sem passar pelo DataJud.
  - Recalcular a estimativa automaticamente (sem rotina agendada, como na Spec 001).
  - Prazos com publicação que já estão no banco (ex.: prazos 3 e 4) — continuam iguais.
- **Restrições (não pode quebrar):**
  - Contagem em dias úteis (cível/trabalhista/administrativo) e dias corridos com recesso (criminal) de `calcular_data_vencimento`.
  - Formato de `ProcessoResponse` e `PrazoResponse` (campo `interno` continua).
  - Spec 001: encerrados fora da piscina e de "Meus Processos Ativos".
  - Migrations do Alembic (nada de `create_all`).

## 5. Diretrizes Técnicas
- Código direto, no estilo do projeto.
- Constante para os 30 dias no frontend (ex.: `DIAS_ALERTA_ESTIMATIVA = 30`), ao lado de `analisarPrazo`.
- A migration de dados usa `op.execute` com SQL simples:
  - `upgrade`: `UPDATE prazos SET finalizado = true WHERE interno = true AND data_publicacao IS NULL`;
  - `downgrade`: o inverso (`finalizado = false` com o mesmo filtro). Hoje todos esses prazos estão `finalizado = false`, então o inverso restaura o estado.
- **Casos de borda:**
  - Processo sem estimativa e sem prazo → "Sem prazo aberto" em cinza.
  - Processo com prazo de verdade (com publicação) → o badge segue o prazo, como hoje.
  - Exatamente 30 dias depois de vencida → ainda vermelho/laranja; a partir do 31º, cinza.
  - Assumir processo antigo que tem só o Prazo Inicial finalizado → com data cria prazo novo; sem data fica "Sem prazo aberto".
  - Trocar o tipo de um processo encerrado → `prazo_estimado` continua `null`.

## 6. Etapas de Implementação
1. Migration de dados. → `alembic upgrade head`; `SELECT` mostra os 10 prazos internos sem publicação com `finalizado = true` e os prazos 3 e 4 intactos.
2. Cadastro sem Prazo Inicial. → `POST /processos/` devolve `prazos: []`.
3. `POST`/`PATCH /prazos/` só com publicação. → `POST` sem `data_publicacao` dá 422; `PATCH` com `data_publicacao: null` dá 400.
4. `prazo_estimado = null` para encerrado. → "Atualizar DataJud" no processo 3 deixa `prazo_estimado` nulo.
5. Remover `prazo-movimentacao` e o código sem uso. → a rota responde 404; backend importa sem erro.
6. Frontend: assumir, badges com a regra dos 30 dias e "Sem prazo aberto". → conferir na tela.

## 7. Critérios de Aceite
- [x] Dado o banco atual, quando a migration roda, então os prazos internos sem publicação ficam `finalizado = true` e os prazos com publicação não mudam. *(Finalizados: 1, 2, 6, 7, 8, 9, 10, 11, 13 e 16. Abertos: 3, 4 e 12 — o 12 ganhou publicação quando o processo 13 foi assumido; o 16 é do processo 17, cadastrado em 03/10.)*
- [x] Dado um cadastro novo, quando salvo, então o processo nasce **sem prazo** e aparece na piscina como "Sem prazo aberto" (se não tiver estimativa). *(API: `prazos: []`. Card conferido na tela pelo Savio.)*
- [x] Dado um processo na piscina, quando assumo **sem** data de publicação, então ele fica sem prazo e aparece como "Sem prazo aberto".
- [x] Dado um processo Civil, quando assumo com publicação em 25/09/2026, então é criado um prazo novo vencendo em 19/10/2026 (mesma conta do prazo 4 que já existe). *(API: 200, vence 2026-10-19, `interno = false`)*
- [x] Dado `POST /prazos/` sem `data_publicacao`, então 422. *(API: 422, `body.data_publicacao: Field required`)*
- [x] Dado um processo com estimativa vencida há até 30 dias **sem** petição depois (ex.: processo 10 do escritório de teste, estimativa 18/09/2026), então aparece em **vermelho** "Vencido há N dias (estimado)" (15 dias em 03/10). *(O processo 13 foi assumido e saiu da piscina. Conferido na tela pelo Savio.)*
- [x] Dado um processo com estimativa vencida há menos de 30 dias **e** petição depois da publicação (ex.: processo 11, estimativa 18/09/2026), então aparece em **laranja** com "pode já ter sido respondida". *(Conferido na tela pelo Savio.)*
- [x] Dado um processo na piscina com estimativa vencida há mais de 30 dias (ex.: processo 17 do escritório 1, estimativa 13/08/2026), então aparece em **cinza** "Sem prazo em aberto (última publicação em 23/07/2026)". *(O processo 1 já foi assumido. Conferido na tela pelo Savio.)*
- [x] Dado um processo encerrado, quando cadastro ou clico em "Atualizar DataJud", então `prazo_estimado` fica nulo. *(Testado no escritório de teste com `30032588320258060151`: publicação 28/07/2026, `prazo_estimado = null` no cadastro e no Atualizar. Os processos 2 e 3 do escritório 1 ficam nulos no próximo Atualizar.)*
- [x] Dado `GET /processos/{id}/prazo-movimentacao`, então 404. *(API: 404 Not Found)*

> **Desvio (implementação, 03/10/2026):** o painel "Meus Processos Ativos" e a aba "Meus Processos" usavam sempre `prazos[0]`, mesmo finalizado — depois da migration, o processo 1 continuaria mostrando "Vence em 2 dias". Passaram a usar o **prazo em aberto que vence primeiro** (`prazoAberto` no `Dashboard.tsx`). Não estava listado na seção 4, mas é consequência direta de "os internos saem da contagem".

## 8. Testes e Validação
### Automatizados
- [x] O projeto **ainda não tem** pasta `tests/` nem suíte automatizada. Esta spec não cria uma; a validação é manual (abaixo).
### Manual
- [x] **Ação:** `alembic upgrade head` → **Esperado:** migration aplicada; `SELECT id, finalizado FROM prazos` confirma os finalizados.
- [x] **Ação:** `alembic downgrade -1` e `upgrade head` de novo → **Esperado:** volta e reaplica sem erro.
- [x] **Ação:** `POST /processos/` pelo `/docs` → **Esperado:** `prazos: []`.
- [x] **Ação:** `POST /prazos/` sem `data_publicacao` → **Esperado:** 422.
- [x] **Ação:** `PATCH /prazos/{id}` com `{"data_publicacao": null}` → **Esperado:** 400. *(400 "O prazo precisa da data da publicação.")*
- [x] **Ação:** assumir um processo da piscina sem data e outro com data → **Esperado:** "Sem prazo aberto" / prazo novo com vencimento calculado.
- [x] **Ação:** abrir a piscina e a prévia dos processos 17 (escritório 1) e 10, 11, 12 (escritório de teste) → **Esperado:** cinza / vermelho / laranja / "Vence em N dias".
- [x] **Ação:** `GET /processos/1/prazo-movimentacao` → **Esperado:** 404.

## 9. Perguntas em Aberto
- Nenhuma no momento.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
