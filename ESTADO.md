# Estado do projeto — Argus Legis

Retrato de **18/10/2026**, a partir da branch `feat/data-obrigatoria-assumir`.
Gerado pela skill `arruma-projeto` — o próximo retrato sobrescreve este.

> Conferido em 18/10: o código não mudou desde 15/10 (`Dashboard.tsx` parado
> desde 10/10, `origin/main` no PR #71, Docker parado). A novidade é o time de
> agentes no Maestri, logo abaixo.

## Em andamento

Trabalho no working tree, ainda sem nenhum commit. A branch saiu da `main` no
PR #71 e não tem commits próprios.

### Data da publicação obrigatória no "Assumir"

- **O que é:** o modal de prévia da piscina não deixa mais assumir sem a data
  da publicação. O campo deixou de ser "(opcional)", ganhou asterisco, e o
  prazo é sempre criado junto com o assumir. Quando o DataJud achou a
  publicação, a data já vem preenchida (`Dashboard.tsx:166`) e o advogado pode
  trocar.
- **Por quê:** desde a Spec 002 o prazo só nasce da publicação, e a única tela
  que cria prazo é o "Assumir". Quem assumia sem a data ficava com o processo
  "Sem prazo aberto" para sempre — e o modal prometia o contrário ("o processo
  fica sem prazo até você informar a publicação"). Era a ponta solta 1 do
  retrato de 10/10.
- **Decisões tomadas:** em 10/10 foi escrita e implementada uma Spec 004
  ("Registrar publicação" no processo completo, aviso de publicação nova, API
  recusando data futura) e **desfeita a pedido do Sávio**. A decisão final foi
  só tornar a data obrigatória no Assumir, **sem formulário para publicações
  seguintes**. Não existe `specs/004-...` — não recriar sem conversar.
- **Arquivos:** [`frontend/src/pages/Dashboard.tsx`](frontend/src/pages/Dashboard.tsx)
  (`handleAssumirProcesso`, linha ~249; texto do modal, linha ~1403)
- **Falta:**
  - ~~Testar no navegador~~ — **testado em 18/10 pelo Arquiteto**, os 4
    casos ok (sem data, data sugerida, data trocada, sem publicação no
    DataJud). Prazos #26 e #27 conferidos no banco. Deixou dados de teste:
    "Escritorio Teste Assumir" com 2 usuários, 1 cliente, processos #23–#25
    e prazos #26–#27 — apagar quando não servirem mais.
  - Commitar (skill `commit`), abrir PR e o Sávio fazer o merge.
  - Entrada no `CHANGELOG.md`.

### Este `ESTADO.md`

Também aparece como modificado: é o retrato de 10/10, que nunca foi commitado,
agora substituído por este.

## Time de agentes no Maestri (montado em 17/10)

Este terminal ("Argus Legis") é o **Maestro**. Dois agentes Claude Code,
ligados só a ele:

- **Pedreiro** — papel "Backend Argus": `app/`, `alembic/`, `requirements.txt`.
- **Arquiteto** — papel "Frontend Argus": `frontend/`.

- **Decisão:** toda comunicação passa pelo Maestro. A ligação direta
  Pedreiro ↔ Arquiteto foi criada e **desfeita a pedido do Sávio**, para
  testar primeiro esse formato. Se ficar lento, religar no canvas e devolver
  aos papéis a instrução de falar um com o outro.
- **Plano:** o Maestro faz o brainstorm e a spec (skills `brainstorming` e
  `spec`) e depois distribui a spec para os dois implementarem.
- Os papéis valem só para este workspace e mandam seguir as regras do Sávio
  (código simples, sem commit/push/PR sem pedido, nunca derrubar o Docker).
- Os agentes abrem em `.maestri/roles/<id>/`, não na raiz. Ao passar uma
  tarefa, dizer o caminho do projeto.
- Até agora só receberam mensagens de teste (diretório e uma piada). Nenhuma
  tarefa real ainda.

## Commits desta branch ainda não mergeados

Nenhum. A `main` local é igual à `origin/main` (PR #71, 04/10) e ninguém
publicou nada novo desde então.

## O que mudou no resto do time

Nada desde 04/10. Última atividade remota: PRs #70 e #71 do Victor (liberar e
excluir processo da piscina; README/CHANGELOG das peças), já na `main` e já
descritos no retrato anterior. Sem risco de conflito com o `Dashboard.tsx`.

## Pontas soltas

Da mais urgente para a menos.

0. **Pasta `.maestri/` não rastreada** (papéis dos agentes). Decidir antes
   do próximo commit: `.gitignore` ou versionar para o time.
1. **A obrigatoriedade é só na tela.** O backend continua aceitando
   `PATCH /processos/{id}` com `responsavel_id` sem prazo nenhum, e o PATCH e o
   POST do prazo são duas chamadas separadas: se o POST falhar, o processo fica
   assumido sem prazo, igual ao problema antigo. Para um projeto acadêmico
   pode bastar — vale decidir conscientemente.
2. **Processos já assumidos sem data continuam presos** em "Sem prazo aberto".
   A mudança vale daqui para frente; os antigos não ganham como receber a data
   (decisão de não ter formulário). Conferir no banco quantos existem quando o
   Docker subir.
3. **Aviso ao ADMIN quando o processo chega com prazo vencido** — pedido em
   28/09, ainda não feito.
4. **Tipo Administrativo com 30 dias úteis**
   ([prazo_service.py:11](app/service/prazo_service.py#L11)) — processo com CNJ
   é judicial e seguiria o CPC (15 dias úteis).
   - **Por que 30:** ⚠️ não recuperável do repositório — confirmar com quem escreveu.
5. **Aviso "este processo tem N peças" ao excluir** — anotado ao fechar a
   Spec 003.
6. **Filtro/ordenação da piscina por vencimento** — "vou fazer depois" (28/09).
7. **`MELHORIAS.md` desatualizado** (27/09): itens 1 e 3 já resolvidos pela PR
   #56 e nada das specs 001–003 lá.
8. **12 branches remotas já mergeadas** no GitHub; **PR #21 do Fernando** aberto
   desde 07/04; **stash antigo** em `dev-savio`.
9. **O script `.claude/skills/arruma-projeto/scripts/coleta.sh` não existe** —
   a skill o cita, mas a pasta `scripts/` nunca foi criada. A coleta foi feita
   à mão.

## Decisões que não estão no código

- **Sem router no front.** Troca de tela por estado; F5 volta para o Painel.
- **DataJud não conta prazo, só estima.** Os dados chegam com semanas de
  atraso; a data da publicação é sempre confirmada pelo advogado no DJEN.
- **Petição depois da *disponibilização*, não da publicação.**
- **Sem formulário de publicações seguintes** (10/10) — ver acima.
- **Merge de PR é feito pelo Sávio** (o modo automático do Claude Code bloqueia
  `gh pr merge` e o GitHub não deixa o autor aprovar o próprio PR).

## Como retomar

1. Abrir o OrbStack (o Docker está parado — o socket não responde) e subir os
   containers: `docker compose up -d`.
2. ~~Testar o "Assumir"~~ — feito em 18/10.
3. Commitar o `Dashboard.tsx` (e, se quiser, este `ESTADO.md` e uma linha no
   `CHANGELOG.md`), abrir o PR e fazer o merge.
4. Próxima tarefa: decidir sobre as pontas 1 e 2, ou seguir para o aviso ao
   ADMIN (ponta 3).
