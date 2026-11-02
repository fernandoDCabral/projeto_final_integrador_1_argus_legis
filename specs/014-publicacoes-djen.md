# Spec 014: Publicações do DJEN no processo
**Status:** Implementada   **Data:** 2026-11-02
**Relacionadas:** Spec 010 (data de publicação pelo DJEN), Spec 013 (atualizar todos pelo DJEN e prazo "A conferir") · `MELHORIAS.md` item 13 (falta a entidade de movimentação/publicação)

## 1. Contexto
- **Como funciona hoje:**
  - O cartão "Movimentações" do processo completo (`Dashboard.tsx`, `aria-label="Movimentações do DataJud"`) mostra só `processos.movimentacoes`, uma cópia em JSON do que o DataJud devolveu. A lista só muda no "Atualizar processo" (`POST /processos/{id}/datajud`), que troca a lista inteira.
  - O "Atualizar todos" (`POST /processos/{id}/djen`, Spec 013) muda só as colunas de publicação do processo (`data_publicacao`, `data_disponibilizacao`, `fonte_publicacao`, `tipo_publicacao`, `link_publicacao`, `hash_publicacao`) e o prazo. A linha do tempo não muda.
  - `djen_service.buscar_ultima_publicacao` baixa **todas** as comunicações do processo, mas guarda só a mais recente (ativa e que não seja Distribuição). As outras são jogadas fora.
  - `prazo_service.criar_prazo_a_conferir` cria o prazo "A conferir" a partir de `processo.data_publicacao`, **para qualquer destinatário**.
  - Ao assumir, a data sugerida é `processo.data_publicacao` (`Dashboard.tsx`, `setDataPublicacaoAssumir`).
  - A OAB é um texto livre e opcional em `usuarios.oab` (`String(20)`), preenchido no "Novo advogado" (`Dashboard.tsx`, campo com `required`) e no cadastro do escritório (`admin_oab`, `CadastroEscritorio.tsx`). No banco local há três formatos: `123456/CE`, `CE12345` e `CE00000`.
- **Problema observado:**
  - No processo `3000896-35.2024.8.06.0122` (id 40, assumido), o DJEN tem **8 comunicações**, mas o Argus mostra só a última e nenhuma aparece na linha do tempo.
  - A mesma sentença sai como **duas comunicações** em 17/04/2026 (números 453 e 454, hashes diferentes), uma para a OAB 56977/CE e outra para a OAB 29442/BA (outra parte). Se a última comunicação for a da outra parte, o advogado do Argus ganha um prazo "A conferir" que não é dele.
  - O DJEN manda a OAB separada (`"numero_oab": "56977", "uf_oab": "CE"`). O texto livre do Argus não dá para comparar com segurança.

## 2. Objetivo
- **O que fazer:** guardar todas as comunicações do DJEN numa tabela `publicacoes` e mostrá-las numa aba "DJEN" no cartão "Movimentações", ao lado da aba "DataJud", com o filtro "Só as minhas". Separar a OAB do usuário em número e UF, e só criar prazo "A conferir" a partir de publicação dirigida à OAB do responsável.
- **Por que fazer:** o advogado vê todas as publicações do processo, não só a última. E o prazo "A conferir" deixa de nascer de intimação da outra parte.

## 3. Decisões
- **Decidido:** **duas abas** ("DataJud" e "DJEN") no cartão "Movimentações", e não uma linha do tempo misturada. **Porque** foi a escolha do Sávio: cada fonte mostra o que é dela, sem duplicar o mesmo ato (o DataJud registra depois, como "Disponibilização no Diário" ou "Publicação", o que o DJEN já mostrou).
- **Descartado:** gravar o item do DJEN dentro de `processos.movimentacoes`. **Porque** o "Atualizar processo" troca a lista inteira e apagaria o item, e quando o DataJud alcança o item fica duplicado. Resolver isso exigiria juntar as duas listas a cada consulta.
- **Descartado:** montar o item do DJEN na tela a partir das colunas do processo, sem tabela. **Porque** só mostra a última publicação.
- **Decidido:** **tabela `publicacoes`**, preenchida a cada consulta ao DJEN. **Porque** a aba abre sem depender do DJEN (que dá 429 e cai), cada publicação fica com as OABs destinatárias e uma futura caixa de entrada no Painel reaproveita a tabela.
- **Descartado:** consultar o DJEN na hora em que a aba é aberta. **Porque** a aba ficaria vazia ou com erro sempre que o DJEN falhasse, e cada clique gastaria uma chamada.
- **Decidido:** a caixa de entrada de publicações no Painel **fica para outra spec**. **Porque** traz marcação de lida e contador, o que dobraria esta entrega. Por enquanto a etiqueta "★ Nova publicação: confira o prazo" da Spec 013 cobre o aviso.
- **Decidido:** o filtro **"Só as minhas"** fica desligado por padrão e compara com a OAB do **usuário logado**. **Porque** o Sávio quer que o advogado possa ver tudo, inclusive as comunicações da outra parte.
- **Decidido:** OAB em **duas colunas**, `oab_numero` (só dígitos, sem zeros à esquerda) e `oab_uf` (uma das 27 UFs). **Porque** o Sávio pediu um formato mais certo, e é o mesmo do DJEN, então a comparação vira um "igual".
- **Decidido:** a OAB continua **opcional para todos os perfis**, inclusive ADVOGADO. **Porque**, nas palavras do Sávio, "vai que é um trainee da vida sem OAB". O `required` do "Novo advogado" sai.
- **Descartado:** OAB obrigatória para ADVOGADO. **Porque** barraria o trainee.
- **Decidido:** o prazo "A conferir" nasce **só de publicação dirigida à OAB do responsável**. Se o responsável não tiver OAB, ou a última publicação vier do DataJud (que não informa o destinatário), vale a regra de hoje. **Porque** o prazo de cada parte conta da intimação dela, e assim não nasce prazo falso.
- **Descartado:** manter a regra de hoje (qualquer publicação). **Porque** gera prazo da outra parte, que o advogado teria que descartar à mão.
- **Descartado:** um prazo para cada publicação nova. **Porque** enche o advogado de prazos "A conferir" para tratar.
- **Decidido:** uma OAB por usuário. **Porque** inscrição suplementar em outro estado é rara no escritório hoje (YAGNI).
- **Decidido:** o texto da comunicação e os nomes das partes **não** vão para o banco. **Porque** é dado pessoal (LGPD), mesma regra da Spec 010. O link leva ao documento.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/models/publicacao.py` (novo), `app/models/__init__.py`, `app/models/processo.py` (relação `publicacoes`), `app/models/usuario.py` (`oab_numero`, `oab_uf`)
  - `alembic/versions/<nova>_publicacoes_e_oab.py` (nova, depois de `c9d0e1f2a3b4`)
  - `app/schemas/publicacao.py` (novo) e o `__init__` dos schemas, `app/schemas/usuario.py`, `app/schemas/registro.py`
  - `app/utils/validators.py` (lista das 27 UFs)
  - `app/service/djen_service.py`, `app/service/datajud_service.py`, `app/service/prazo_service.py`, `app/service/registro_service.py`
  - `app/routes/processos.py` (gravar nas duas rotas e a rota nova `GET /processos/{id}/publicacoes`), `app/routes/usuarios.py`
  - `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/CadastroEscritorio.tsx`, `frontend/src/types/auth.ts`
  - `CHANGELOG.md`, `specs/README.md`
- **Fora de escopo:**
  - Caixa de entrada de publicações no Painel e marcação de lida.
  - Busca de publicações pela OAB (sem número de processo).
  - Mais de uma OAB por usuário.
  - Guardar o texto da comunicação.
  - Aba DJEN na prévia da piscina (ela continua mostrando só a última publicação).
  - Gravar publicações no cadastro do processo (o processo ainda não existe na hora da consulta).
  - Carga inicial dos processos já cadastrados.
  - Tela para editar a OAB de um usuário já cadastrado (não existe hoje).
- **Restrições (não pode quebrar):**
  - As colunas de publicação do processo continuam guardando a última publicação **de qualquer destinatário** e calculando o `prazo_estimado` da piscina.
  - O resultado do "Atualizar todos" (`nova_publicacao`, `sem_novidade`, `pulado`, `erro`) e a regra de pular os consultados na última hora (Spec 013).
  - A trava da Spec 013: prazo descartado não volta.
  - Se o DJEN falhar, a consulta segue só com o DataJud e nada da tabela é apagado.
  - A aba DataJud fica exatamente como o cartão de hoje, com o aviso de atraso do CNJ.

## 5. Diretrizes Técnicas
- **Tabela `publicacoes`:** `id`, `processo_id` (FK, `ondelete CASCADE`), `hash` (`String(100)`), `data_disponibilizacao` (`Date`), `data_publicacao` (`Date`), `tipo` (`String(100)`, nulo), `orgao` (`String(255)`, nulo), `link` (`String(500)`, nulo), `oabs` (`JSON`, lista como `["56977/CE"]`). Regra única `uq_publicacoes_processo_hash` em (`processo_id`, `hash`).
- **`djen_service`:**
  - `buscar_publicacoes(digitos, db)` devolve uma lista de dicionários no formato da tabela, só com as comunicações ativas (`ativo = true`). As OABs saem de `destinatarioadvogados[].advogado`, como `f"{int(numero_oab)}/{uf_oab}"`. Advogado sem número ou UF é ignorado. Mantém o tratamento de 429 e o `DjenIndisponivel`.
  - `buscar_ultima_publicacao` passa a chamar `buscar_publicacoes`, tirar a Distribuição e pegar a de maior `data_disponibilizacao`. Devolve o mesmo dicionário de hoje.
  - `gravar_publicacoes(db, processo, publicacoes)` adiciona pela relação `processo.publicacoes` só os hashes que o processo ainda não tem. Não faz commit.
- **`consultar_processo`:** chama `buscar_publicacoes` uma vez e devolve a lista no campo interno `publicacoes` (como o `djen_respondeu`, fora do schema da resposta).
- **Rotas que gravam:** `POST /processos/{id}/datajud` e `POST /processos/{id}/djen` chamam `gravar_publicacoes` **antes** de `criar_prazo_a_conferir`.
- **`criar_prazo_a_conferir`:** se `responsavel.oab_numero` e `fonte_publicacao == "DJEN"`, a base é a publicação de maior `data_publicacao` em `processo.publicacoes` cuja lista `oabs` contém `f"{oab_numero}/{oab_uf}"` e cujo `tipo` não é Distribuição. Se não houver nenhuma, não cria prazo. Fora desse caso, a base continua sendo `processo.data_publicacao`. A descrição e a trava "mais nova que o último prazo" continuam iguais.
- **`GET /processos/{id}/publicacoes`:** usa a mesma checagem de escritório das outras rotas (404 se for de outro escritório), ordena por `data_disponibilizacao` decrescente e devolve cada item com `para_mim` (OAB do usuário logado presente em `oabs`; `false` se ele não tiver OAB).
- **OAB nos schemas:** `oab_numero` aceita só dígitos e guarda sem zeros à esquerda (`"00056977"` vira `"56977"`). `oab_uf` passa por `padroniza_uf` e precisa estar na lista das 27 UFs. Só um dos dois preenchido dá 400 "Informe o número e a UF da OAB.". Vale para `UsuarioCreate` e para o registro do escritório (`admin_oab_numero`, `admin_oab_uf`).
- **Migration de dados da OAB:** para cada `usuarios.oab`, os dígitos viram `oab_numero` (sem zeros à esquerda; vazio se só tiver zeros) e as 2 letras viram `oab_uf`, se forem uma UF válida. Se faltar um dos dois, os dois ficam nulos. O `downgrade` recria `oab` como `numero/UF`.
- **Assumir:** ao abrir a prévia, a tela busca `GET /processos/{id}/publicacoes` e sugere a `data_publicacao` da mais recente com `para_mim` que não seja Distribuição. Se não houver, sugere `processo.data_publicacao`, como hoje.
- **Tela, aba DJEN:** abas com `role="tablist"`/`role="tab"`, abrindo na DataJud. A lista carrega ao clicar na aba e recarrega depois do "Atualizar processo". Cada linha mostra data de disponibilização, tipo, órgão, "ver documento" (se houver link) e a marca "sua" quando `para_mim`. A Distribuição aparece com "(não abre prazo)". A caixa "Só as minhas" fica desabilitada, com "Cadastre sua OAB para filtrar", quando o usuário não tem OAB.
- **Casos de borda:**
  - Mesma comunicação repetida para cada parte (hashes diferentes): as duas entram, e o filtro separa.
  - Mesmo hash em consultas seguidas: não duplica (checagem na rota e regra única no banco).
  - DJEN fora: a aba mostra o que já está guardado e a consulta segue com o DataJud.
  - Processo sem nenhuma publicação guardada: "Nenhuma publicação guardada. Clique em Atualizar processo para buscar no DJEN."
  - Comunicação cancelada depois de guardada: continua na tabela (não há remoção nesta spec).
  - Link com mais de 500 caracteres: fica nulo, como hoje.

## 6. Etapas de Implementação
1. Lista das 27 UFs em `validators.py` e os campos `oab_numero`/`oab_uf` nos schemas de usuário e de registro. Verificar: criar usuário pela API com e sem OAB, e com a OAB incompleta.
2. Model `Publicacao`, relação em `Processo`, colunas novas em `Usuario` e a migration (tabela, conversão da OAB e remoção de `oab`). Verificar: `alembic upgrade head`, conferir os usuários no banco, `downgrade -1` e `upgrade` de novo.
3. `buscar_publicacoes`, `buscar_ultima_publicacao` em cima dela e `gravar_publicacoes`. Verificar: "Atualizar processo" no processo 40 grava 8 linhas, e rodar de novo não duplica.
4. A regra nova em `criar_prazo_a_conferir`. Verificar com os casos 4 e 5 da seção 7.
5. A rota `GET /processos/{id}/publicacoes` com `para_mim`. Verificar pelo `/docs`.
6. Tela: formulários de OAB (número e UF) e a coluna OAB da Equipe.
7. Tela: abas DataJud/DJEN, lista, "Só as minhas" e estados vazios.
8. Tela: sugestão da data ao assumir.
9. `CHANGELOG.md` e `specs/README.md`.

## 7. Critérios de Aceite
- [x] Dado um usuário com `oab = "123456/CE"`, quando a migration roda, então ele fica com `oab_numero = "123456"` e `oab_uf = "CE"`. `CE12345` vira `12345`/`CE`, e `CE00000` fica com os dois nulos.
- [x] Dado o "Novo advogado", quando envio o número `00056977` e a UF `ce`, então o usuário é criado com `56977`/`CE`. Com só o número, ou UF `XX`, recebo 400. Sem número e sem UF, ele é criado.
- [x] Dado o processo 40 sem publicações guardadas, quando clico em "Atualizar processo", então a tabela `publicacoes` fica com 8 linhas desse processo. Clicando de novo, continuam 8.
- [x] Dado o processo 40 assumido por um advogado com OAB 56977/CE, e a publicação mais recente sendo dirigida só à OAB 29442/BA, quando atualizo, então **não** nasce prazo "A conferir" dessa publicação.
- [x] Dado o mesmo processo e uma publicação mais recente dirigida à OAB 56977/CE, quando atualizo, então nasce um prazo "A conferir" com a data dessa publicação.
- [x] Dado um processo assumido por advogado sem OAB, quando sai publicação nova, então o prazo "A conferir" nasce como hoje.
- [x] Dado um usuário de outro escritório, quando chama `GET /processos/40/publicacoes`, então recebe 404.
- [x] Dado o advogado com OAB 56977/CE, quando abre a aba DJEN do processo 40, então as comunicações dirigidas a ele aparecem com "sua". Com "Só as minhas" marcado, a de 17/04/2026 para a OAB 29442/BA some.
- [x] Dado um usuário sem OAB, quando abre a aba DJEN, então a caixa "Só as minhas" aparece desabilitada com "Cadastre sua OAB para filtrar".
- [ ] Dado o DJEN fora do ar, quando abro a aba DJEN, então vejo as publicações já guardadas, e o "Atualizar processo" segue com o DataJud. _(não testado: o DJEN não caiu durante o teste; no código, a falha deixa a lista vazia e nada é apagado)_
- [x] Dado o processo completo, quando abro, então a aba DataJud aparece selecionada e igual ao cartão de hoje.

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é manual, pela API (`/docs` e `psql`) e pela tela.
### Manual
- [x] **Ação:** `alembic upgrade head` e `select id, oab_numero, oab_uf from usuarios` → **Esperado:** OABs convertidas como na seção 7; `downgrade -1` volta `oab` como `numero/UF`.
- [x] **Ação:** `POST /usuarios/` com OAB completa, incompleta, UF `XX` e sem OAB → **Esperado:** 200, 400, 400 e 200.
- [x] **Ação:** "Atualizar processo" no processo 40, duas vezes, e `select count(*) from publicacoes where processo_id = 40` → **Esperado:** 8 nas duas vezes.
- [x] **Ação:** no processo 40 assumido por advogado com OAB 56977/CE, apagar o último prazo e a publicação mais recente dirigida a ele e deixar a última sendo a da 29442/BA; rodar "Atualizar todos" → **Esperado:** nenhum prazo "A conferir" novo.
- [x] **Ação:** mesmo processo, advogado sem OAB → **Esperado:** o prazo "A conferir" nasce como na Spec 013.
- [x] **Ação:** `GET /processos/40/publicacoes` com token de outro escritório → **Esperado:** 404.
- [x] **Ação:** na tela, abrir o processo 40 e trocar de aba, marcar e desmarcar "Só as minhas" → **Esperado:** como na seção 7.
- [x] **Ação:** abrir a prévia de um processo da piscina com publicação para a OAB do advogado logado → **Esperado:** a data sugerida é a dessa publicação.
- [ ] **Ação:** derrubar o acesso ao DJEN (URL errada no `.env` ou sem rede no container) e abrir a aba DJEN → **Esperado:** a lista guardada aparece e o "Atualizar processo" funciona só com o DataJud. _(não testado, idem)_

## 9. Perguntas em Aberto
- Quando o prazo é ligado a uma publicação, vale guardar `prazos.publicacao_id`? Ficou fora desta spec (a ligação é pela data), mas a caixa de entrada pode precisar.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
