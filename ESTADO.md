# Estado do projeto — Argus Legis

Retrato de **26/09/2026**, a partir da branch `main`.
Gerado pela skill `arruma-projeto` — o próximo retrato sobrescreve este.

## Em andamento

**Correção de segurança do item 10** (isolamento entre escritórios em
processos/prazos) — feita e **verificada por exploit real**, ainda **não
commitada**:

- `app/utils/autorizacao.py`: `verificar_acesso_ao_processo` agora recebe
  `escritorio_id` e barra (404) processo de outro escritório antes de checar
  `responsavel_id`.
- `app/routes/processos.py` (5 call-sites) e `app/routes/prazos.py` (3
  call-sites): passam `current_user.escritorio_id` na chamada.
- `MELHORIAS.md`: item 10 marcado como resolvido, com o resumo do exploit.

Teste feito: registrei dois escritórios de teste, um advogado real no
"atacante", um processo sem responsável no "vítima" — antes da correção
`GET/PATCH/DELETE /processos/{id}` e as rotas de `/prazos/` vazavam e permitiam
editar/apagar; depois, 404 uniforme nos quatro ataques. Dados de teste já
apagados do banco local.

**Falta**: revisar o diff e commitar (ver skill `commit`).

`git status` também mostra `.claude/` (arquivos de skill do Claude Code) como
untracked.

O local está **2 commits atrás de `origin/main`**, fast-forward puro (só uma
linha no `CHANGELOG.md`, sem conflito):

```bash
git pull
```

## O que mudou no resto do time desde o último retrato (memória de 12 dias atrás)

- **PR #56 — `feature/feriados-dias-uteis`** (mergeada): entregou o Alembic
  definitivo — `create_all` saiu do `app/main.py`, 8 migrations em
  `alembic/versions/` — e o cálculo de prazo em **dias úteis para Fortaleza/CE**
  (feriados nacionais, estaduais do CE, municipais de Fortaleza, e recesso
  forense de 20/dez a 20/jan), tanto para o prazo oficial (pós-publicação)
  quanto para o prazo interno da petição inicial. Isso resolve os itens 1 e 3
  do `MELHORIAS.md`.
- **PR #55 — `feature/consulta-datajud`** (mergeada): `GET /datajud/{cnj}` +
  botão no modal de processo que só pré-preenche campos. Decisão já registrada
  em memória: DataJud não serve para *contar* prazo, porque os dados chegam com
  semanas de atraso.
- **PR #59 — `docs/changelog-datajud`** (mergeada): só adicionou a entrada da
  PR #55 no `CHANGELOG.md`.
- **PR #21** (`fernando_dev`, aberta em abril/2026, "estrutura inicial e layout
  base") continua aberta e sem atividade — parece esquecida.

## Itens do MELHORIAS.md que continuam de pé (conferidos agora no código)

- **Item 4** — prazo ainda nasce do `tipo_processo`
  (`PRAZOS_POR_TIPO` em [prazo_service.py:8](app/service/prazo_service.py#L8)),
  não do ato.
- **Item 5** — ainda não existe `GET /prazos/`
  ([prazos.py](app/routes/prazos.py) só tem `POST`/`PATCH`/`DELETE`).
- ~~Item 10~~ — resolvido nesta sessão, ver "Em andamento" acima.
- **Item 12** — `cnj` ([processo.py:17](app/models/processo.py#L17)) já é
  `nullable`, mas continua `unique=True` global em vez de
  `UniqueConstraint("cnj", "escritorio_id")`.

O `MELHORIAS.md` em si está desatualizado (última edição 19/08/2026): ainda
lista os itens 1, 3 e 23 como pendentes, mas os três já foram resolvidos
(Alembic, dias úteis, e `.gitignore` já cobre `.env.*`).

## Pontas soltas

1. **`.claude/`** aparece como untracked — confirmar se é pra versionar ou
   entrar no `.gitignore` antes do próximo commit, pra não subir sem querer.
2. **Containers todos parados** — inclusive `frontend` saiu com código 1 (erro)
   há 37h. Antes de subir de novo, vale `docker compose logs frontend` pra
   saber se foi só um shutdown normal ou se quebrou algo.
3. **PR #21** parada desde abril — perguntar ao Fernando se ainda faz sentido
   ou se pode fechar.
4. **`MELHORIAS.md` desatualizado** — vale revisar e riscar o que já foi
   entregue, senão a lista passa a mentir sobre o que falta.

## Como retomar

1. `git pull` (trivial, sem conflito).
2. Com Alembic e dias úteis resolvidos, o próximo bloqueador mais sério do
   `MELHORIAS.md` é o **item 10** — isolamento entre escritórios em
   processos/prazos — porque hoje vaza CPF/endereço/telefone de cliente de
   outro escritório.
3. Atualizar o `MELHORIAS.md` tirando o que já foi entregue.
