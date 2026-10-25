# Estado do projeto — Argus Legis

Retrato de **24/10/2026**, a partir da branch `fix/edicao-processo-escritorio` (`origin/main` segue no PR #83).
Gerado pela skill `arruma-projeto` — o próximo retrato sobrescreve este.

## Em andamento

Nada no working tree (só a pasta `.maestri/`, não rastreada de propósito).
As duas issues estão prontas e testadas, cada uma no seu PR, esperando merge.

### Issue #87 — CNJ único por escritório (Spec 008) → PR #89 aberto

- **O que é:** a checagem de CNJ duplicado no cadastro e na edição de processo passa a olhar só o escritório do usuário, e o banco troca a regra "CNJ único na tabela" por "único no par (`escritorio_id`, `cnj`)" (migration `a7b8c9d0e1f2`).
- **Por quê:** issue #87, reproduzida em 22/10 pela API — o escritório B recebia 409 com o **título do processo do escritório A** (vazamento) e não conseguia cadastrar um processo em que os dois atuam.
- **Decisões tomadas** (brainstorm de 22/10, ver `specs/008-cnj-por-escritorio.md`):
  - checagem por escritório **+** regra única no banco no par — e não só tirar a regra do banco (abriria duplicata no mesmo escritório com duas requisições ao mesmo tempo);
  - **descartado** processo compartilhado entre escritórios (muda o modelo inteiro);
  - **descartado** tratar o 500 do clique duplo (já existia, raro).
- **Testado:** Pedreiro pela API e migration (10/10); Testador na tela (5/5 — o caso do 409 só pela API, porque o DataJud do TJCE estava com timeout).
- **Branch:** `fix/cnj-por-escritorio` (5 commits), PR #89 — `MERGEABLE`, sem review em 24/10.
- **Falta:** merge do #89 → spec 008 para `Implementada` → fechar a #87 à mão. O caso 4 (409) foi refeito na tela em 24/10: OK.

### Issue #88 — Edição de processo presa ao escritório (Spec 009) → PR aberto

- **O que é:** o `PATCH /processos/{id}` (só ADVOGADO) aceita `escritorio_id`, `cliente_id` e `responsavel_id` e grava tudo com `setattr`, sem conferir o escritório. Pela API dá para mover um processo para outro escritório ou ligá-lo a cliente de outro escritório.
- **Por quê:** achado do Pedreiro durante a #87; a issue foi aberta em 22/10.
- **Decisões tomadas** (22/10): opção 1 —
  - `escritorio_id` sai do `ProcessoUpdate` (ignorado se vier);
  - `cliente_id` precisa ser do mesmo escritório, senão 404 "Cliente não encontrado neste escritório.";
  - `responsavel_id` precisa ser ADVOGADO do mesmo escritório, senão 404; `null` continua aceito;
  - 404 e não 403, pela regra do `autorizacao.py`;
  - **descartado** "responsável só pode ser o próprio advogado" (fecha a porta de passar o processo a um colega);
  - **descartado** rota própria de "assumir" (muda frontend e duas rotas, maior que a issue).
- **Testado (24/10):** Pedreiro pela API (6/6 + extras); Testador na tela (assumir e liberar, 4/4).
- **Branch:** `fix/edicao-processo-escritorio`, que saiu da `fix/cnj-por-escritorio` (mesma função do PR #89). O PR dela tem que entrar **depois** do #89.
- **Falta:** merge → spec 009 para `Implementada` → fechar a #88 à mão.

## O que mudou no resto do time

- **`origin/feat/feedback-consulta-datajud`** (Victor, 19/10, **sem PR**): círculo girando no botão "Buscar no DataJud" e frase de apoio na demora. Mexe em `frontend/src/pages/Dashboard.tsx`, `frontend/src/index.css` e cria `specs/008-feedback-consulta-datajud.md`. A issue #84 foi fechada em 20/10 sem PR ligado, mas o código **não está na main**.
  - **Conflito:** essa branch também usa o número **Spec 008**, e a linha 008 do `specs/README.md` conflita com o PR #89 (`git merge-tree` confirma conflito só nesse arquivo).

## Pontas soltas

1. **Dois "Spec 008".** O do Victor (19/10) é anterior ao nosso (22/10). Quem entrar depois na main precisa renumerar. Combinar com o Victor antes do merge do #89.
2. **#87 e #88 fora do quadro.** No GitHub Projects a Sprint 5 tem só #85 (notificação por e-mail) e #86 (deploy).
3. **Prazo que fica ao liberar** (Testador, 24/10): liberar não apaga o prazo; com o processo de volta na piscina e o prazo aberto, o card mostra "Sem prazo aberto". Mesmo assunto do prazo duplicado ao liberar/reassumir (nota "Conta de teste"). Sem issue.
4. **Aviso de erro atrás do modal** (Testador, 24/10): no cadastro de processo, o 409 aparece no topo da página, coberto pelo formulário aberto. Sem issue.
5. **Mensagem enganosa com o DataJud fora** (achado do Testador, antigo): diz "preencha os dados manualmente", mas o botão Cadastrar continua travado, porque a Spec 001 exige DataJud. Tirar esse trecho; sem issue ainda.
6. **Dados de teste no banco local:** escritórios "Teste87" (ids 11 a 14), processos 26 a 35 e os usuários desses escritórios. Por causa deles o `downgrade` da migration `a7b8c9d0e1f2` falha localmente (CNJ repetido entre os escritórios 13 e 14).
7. **Issue #78** (hiperlink para tribunais) continua aberta, fora da Sprint 5.

## Como retomar

1. Merge do PR #89 (#87) e depois o PR da #88 (nessa ordem).
2. Specs 008 e 009 → `Implementada` no arquivo e no `specs/README.md`; fechar #87 e #88 à mão.
3. Ambiente: `docker compose up -d` (OrbStack precisa estar aberto); migration em `a7b8c9d0e1f2` no banco local.
