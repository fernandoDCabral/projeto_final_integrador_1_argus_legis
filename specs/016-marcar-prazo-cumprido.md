# Spec 016: Marcar prazo como cumprido
**Status:** Aprovada   **Data:** 2026-11-04
**Relacionadas:** Issue #106 · Spec 002 (revisão da contagem de prazos) · Spec 013 (Atualizar todos pelo DJEN, prazo "A conferir") · `MELHORIAS.md` item 15

## 1. Contexto
- **Como funciona hoje:**
  - A tabela `prazos` tem `finalizado` (bool). O Painel, o Calendário e `prazoAberto` (`Dashboard.tsx`) ignoram prazo com `finalizado = true`.
  - O `PATCH /prazos/{id}` já aceita `finalizado` (`PrazoUpdate`), só para ADVOGADO e só no processo que ele pode acessar. **Nenhuma tela chama isso**: a lista de prazos só mostra a etiqueta "Finalizado" quando o valor já vem `true`.
  - `finalizado = true` hoje vem de dois lugares: os **Prazos Iniciais antigos** (`interno = true`, finalizados na Spec 002) e os prazos **"Descartado"** (a Spec 013 grava `finalizado = true` junto).
- **Problema observado:** o advogado não tem como dizer que já cumpriu um prazo (já se manifestou, já mandou a peça). Ele continua aparecendo como vencido ou urgente no Painel e no Calendário. Exemplo: no processo `3000896-35.2024.8.06.0122`, o prazo de 05/06/2026 aparece vencido, mas há petição protocolada em 18/07 que provavelmente era a resposta. Quando sai uma publicação nova, o prazo "A conferir" nasce ao lado desse prazo velho, e o velho continua parecendo pendente.

## 2. Objetivo
- **O que fazer:** botão para marcar um prazo como **cumprido** (e para desfazer) na tela do processo, e mostrar na lista e no cartão que o prazo foi cumprido. O prazo cumprido sai do Painel e do Calendário.
- **Por que fazer:** o advogado vê só o que falta fazer, sem abrir processo por processo. Também deixa os alertas de prazo (vencido, urgente) confiáveis para qualquer aviso novo construído em cima deles.

## 3. Decisões
- **Decidido:** "cumprido" é `finalizado = true` num prazo com `situacao = "Confirmado"` e `interno = false`. **Porque** a issue pede isso, a coluna já existe e todos os filtros do Painel e do Calendário já a respeitam.
- **Decidido:** coluna nova `prazos.concluido_em` (DateTime com fuso, nula): o momento em que o advogado marcou como cumprido. Preenchida ao cumprir e **limpa ao desfazer**; o "Descartado" não preenche. **Porque** a data do cumprimento é a prova de diligência do escritório, e dado que não foi gravado não se recupera depois (`MELHORIAS.md`, itens 15 e 16: evento de sistema é `DateTime(timezone=True)`). O momento vem do servidor (UTC), nunca do corpo da requisição.
- **Decidido:** os prazos que **já estão** `finalizado` não ganham data (sem preenchimento retroativo). **Porque** não há como saber quando foram marcados; a tela mostra "✔ Cumprido" sem data neles.
- **Decidido:** o botão "Marcar como cumprido" aparece nos prazos **em aberto e confirmados**; o "Desfazer" aparece nos **cumpridos**. Só no processo completo e só para o responsável (mesma regra do `podeConferir`). **Porque** a prévia da piscina não tem responsável, e o ADMIN não tem tela de processo completo nem acesso ao `PATCH /prazos`.
- **Decidido:** prazo **"A conferir" não pode ser marcado como cumprido**: o advogado confirma ou descarta primeiro. **Porque** marcar cumprido um prazo cujos dias ainda são só o padrão do tipo esconderia a etiqueta "★ Nova publicação" sem a conferência que a Spec 013 exige.
- **Decidido:** prazo **"Descartado" não é reaberto** e o **Prazo Inicial antigo** (`interno`) não muda de `finalizado`. O backend recusa com 400. **Porque** o descartado precisa continuar finalizado para a próxima atualização não recriar o mesmo prazo (Spec 013), e o interno foi finalizado de propósito (Spec 002). Como a rota hoje aceita `finalizado` livremente, a tela esconder o botão não basta.
- **Decidido:** a etiqueta do prazo cumprido é **"✔ Cumprido em 18/07/2026"** (sem a data, quando `concluido_em` é nulo), em tom `neutro`. O interno antigo continua "Finalizado". **Porque** o cumprido deve ficar discreto para o que falta aparecer em destaque, e sem essa diferença o interno antigo (também `finalizado`) apareceria como cumprido.
- **Decidido:** sem janela de confirmação. **Porque** é reversível pelo "Desfazer".
- **Decidido:** na tabela de processos e na faixa do processo, quando **não há prazo em aberto mas há prazo cumprido**, o texto passa a ser "✔ Prazo cumprido" (neutro) em vez de "Sem prazo". **Porque** a issue pede que o advogado "bata o olho" e saiba o que falta; "Sem prazo" não diz que foi cumprido.
- **Descartado:** guardar **quem** marcou (`concluido_por_id`). **Porque** hoje o processo assumido tem um único responsável, então quem marcou é deduzível; o autor só passa a importar se o prazo ganhar responsável próprio (`MELHORIAS.md`, item 15). Fica para depois.
- **Descartado:** trocar `finalizado` por um `status` (cumprido, perdido, cancelado). **Porque** é uma mudança maior, que mexe em Painel, Calendário e filtros; é o resto do item 15 do `MELHORIAS.md`.
- **Descartado:** o sistema marcar sozinho como cumprido quando existe petição depois da publicação. **Porque** é um palpite sobre o mérito do prazo; a decisão é do advogado.
- **Descartado:** esconder do Painel os prazos antigos quando há um "A conferir" novo. **Porque** pode esconder um prazo real ainda pendente. O advogado marca o velho como cumprido (é o que esta spec entrega).

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `alembic/versions/<nova>_prazo_concluido_em.py` (revisa `d0e1f2a3b4c5`): `prazos.concluido_em` (DateTime com fuso, nula; os prazos que já existem ficam nulos).
  - `app/models/prazo.py`: a coluna `concluido_em`.
  - `app/schemas/prazo.py`: `concluido_em` no `PrazoResponse` (só leitura; `PrazoUpdate` não aceita).
  - `app/service/prazo_service.py`: validação e preenchimento de `concluido_em` no `atualizar_prazo` (seção 5).
  - `frontend/src/pages/Dashboard.tsx`: botões, etiqueta, texto da tabela e da faixa.
  - `specs/README.md`: linha da spec 016.
- **Fora de escopo:**
  - Autor do cumprimento (`concluido_por_id`), prazo "perdido" ou "cancelado" e o `status` no lugar do booleano (`MELHORIAS.md`, item 15).
  - Preencher `concluido_em` dos prazos que já estão finalizados.
  - Mudar o Painel, o Calendário ou `prazosAbertos` (já ignoram `finalizado`).
  - Criar prazo manualmente ou editar vencimento.
  - Aviso/sino de prazos (spec própria, depende desta).
- **Restrições (não pode quebrar):**
  - `PrazoUpdate` continua com os mesmos campos; `PrazoResponse` só **ganha** `concluido_em`.
  - A migration tem `downgrade` que remove a coluna, e os prazos que já existem não mudam.
  - O "Descartado" e o "A conferir" da Spec 013 funcionam como hoje (confirmar, ajustar dias, descartar).
  - `PATCH /prazos` continua só para ADVOGADO, preso ao escritório e ao responsável (Spec 008/009).
  - Os Prazos Iniciais antigos continuam finalizados.

## 5. Diretrizes Técnicas
- **Backend (`atualizar_prazo`):** se `finalizado` vier no corpo e **mudar** o valor atual:
  - `prazo.interno` → 400 "Prazo inicial antigo não pode ser reaberto nem cumprido.";
  - `prazo.situacao == "Descartado"` → 400 "Prazo descartado não pode ser reaberto.";
  - `prazo.situacao == "A conferir"` e `finalizado = true` → 400 "Confirme ou descarte o prazo antes de marcar como cumprido.".
  - Mandar o mesmo valor que já está continua válido (não muda nada, sem erro, e **não** reescreve `concluido_em`).
  - **`concluido_em`:** quando `finalizado` passa de `false` para `true` por um pedido que **mandou** `finalizado = true`, grava `datetime.now(timezone.utc)`; quando passa de `true` para `false`, limpa (`None`). O `finalizado = true` forçado pelo "Descartado" **não** preenche a data: a decisão olha o valor enviado pelo cliente, não o que o service força depois.
  - Quando o `PATCH` traz `situacao = "Descartado"`, o `finalizado = true` é forçado como hoje; essa validação vem **antes** e não pode barrar esse caminho.
- **Frontend:**
  - Função `cumprido(prazo)`: `prazo.finalizado && prazo.situacao === "Confirmado" && !prazo.interno`.
  - `handleCumprirPrazo(processo, prazo, cumprido: boolean)`: `PATCH /prazos/{id}` com `{ finalizado: cumprido }`, depois `GET /processos/{id}` e atualiza `processoAberto` e `meusProcessos` (mesmo padrão do `handleAtualizarPrazo`). Erro vai para `erroPrazo`.
  - Em `renderListaPrazos`, no ramo final (prazo comum): se `cumprido(prazo)`, etiqueta "✔ Cumprido em dd/mm/aaaa" (neutro; sem a data se `concluido_em` for nulo) e o botão "Desfazer". A data usa o fuso `America/Sao_Paulo`, como a data de cadastro do processo; senão, se `podeConferir && !prazo.finalizado`, o botão "Marcar como cumprido" ao lado da etiqueta de situação. Interno finalizado continua só com "Finalizado".
  - `prazoDoProcesso` e a faixa do `renderProcessoCompleto`: se não há `prazoAberto` e algum prazo é `cumprido`, o texto é "✔ Prazo cumprido" (neutro).
  - Botões com área de toque de 44 px (padrão do projeto) e sem rolagem horizontal em 390 px.
- **Casos de borda:**
  - Processo com um prazo cumprido e um "A conferir": o cumprido vai para o histórico, o "A conferir" continua em destaque e a tabela mostra o "A conferir".
  - Todos os prazos cumpridos e depois "Atualizar" traz publicação nova: nasce um "A conferir" normalmente (a regra da Spec 013 compara datas de publicação).
  - Desfazer um prazo cumprido que já venceu: volta como "Vencido há N dias".
  - Dois cliques rápidos: o botão fica desabilitado enquanto salva (`salvandoPrazo`).
  - Processo encerrado: o prazo continua marcável (a lista de prazos aparece na tela completa); não muda a regra do encerramento.

## 6. Etapas de Implementação
1. Migration e model (`concluido_em`) e `concluido_em` no `PrazoResponse`. → `alembic upgrade head` roda, os prazos antigos ficam com `concluido_em` nulo, e o `downgrade -1` e o `upgrade head` rodam sem erro.
2. Backend: validação e `concluido_em` no `atualizar_prazo`. → no `/docs`, `finalizado = true` num prazo confirmado grava a data; num "A conferir", num descartado e num interno dá 400; `finalizado = false` no cumprido reabre e limpa a data.
3. Frontend: `cumprido()`, `handleCumprirPrazo` e os botões/etiqueta (com a data) na lista de prazos. → marcar e desfazer pela tela do processo.
4. Frontend: texto "✔ Prazo cumprido" na tabela e na faixa. → processo sem prazo em aberto e com cumprido.
5. `specs/README.md` e roteiro manual. → spec listada.

## 7. Critérios de Aceite
- [x] Dado um processo assumido com um prazo confirmado e vencido, quando clico em "Marcar como cumprido", então a etiqueta vira "✔ Cumprido em <data de hoje>", o prazo some do Painel e do Calendário e o contador de vencidos diminui. *(Teste manual 04/11, item A.)*
- [x] Dado esse prazo cumprido, quando clico em "Desfazer", então ele volta como em aberto (vencido ou urgente, conforme a data), reaparece no Painel e no Calendário, e `concluido_em` volta a ser nulo. *(Item A.)*
- [x] Dado um prazo que já estava finalizado antes da migration (ou um "Descartado"), então `concluido_em` é nulo; o descartado continua "Descartado" e o confirmado finalizado mostra "✔ Cumprido" sem data. *(04/11: o descartado e os Prazos Iniciais antigos, na tela, no item B; o confirmado finalizado sem data, executando o `dataCumprimento` do `Dashboard.tsx` sobre o JSON real da API no processo 22: `concluido_em` nulo dá "✔ Cumprido", sem data. Não foi aberto no navegador.)*
- [x] Dado um processo cujos prazos estão todos cumpridos, então a tabela de Meus processos e a faixa do processo mostram "✔ Prazo cumprido", não "Sem prazo". *(Item A.)*
- [x] Dado um prazo "A conferir", então não há botão "Marcar como cumprido" nele; e `PATCH` com `finalizado = true` nele devolve 400. *(Item B na tela; o 400 foi conferido por script.)*
- [x] Dado um prazo "Descartado" ou um Prazo Inicial antigo, então não há botão de cumprir/desfazer, e `PATCH` com `finalizado = false` devolve 400. *(Item B na tela; o 400 foi conferido por script.)*
- [x] Dado um processo com um prazo velho vencido e um "A conferir" novo, quando marco o velho como cumprido, então o "A conferir" continua em destaque com a etiqueta ★. *(04/11, processo 22 com "A conferir": caixa e ★ no topo, 3 botões, valor digitado nos dias mantido, prazo cumprido sem pular de lugar, Painel de 7 para 6 vencidos; com os 3 cumpridos, a faixa e a tabela seguiram mostrando o prazo em aberto, sem "✔ Prazo cumprido".)*
- [x] Dado um ADMIN, então não vê os botões de cumprir; dado um advogado que não é o responsável, o `PATCH` continua dando 403. *(ADMIN sem botão na tela; 403 por HTTP. A tela de outro advogado não é testável: processo assumido não aparece na piscina dos outros.)*
- [x] Dado uma tela de 390 px, então a lista de prazos não tem rolagem horizontal. *(Item D, processo 22 e a caixa "A conferir" no modo celular, sem rolagem horizontal.)*

## 8. Testes e Validação
### Automatizados
- O projeto ainda **não tem pasta de testes automatizados**. A validação é manual, abaixo.
### Manual
- [x] **Ação:** `alembic upgrade head`, conferir `select finalizado, situacao, count(*), count(concluido_em) from prazos group by 1, 2`, depois `downgrade -1` e `upgrade head` de novo → **Esperado:** `concluido_em` nulo em todos os prazos que já existiam; o downgrade e o upgrade rodam sem erro. *(04/11, banco local: `d0e1f2a3b4c5 → e1f2a3b4c5d6`, `downgrade -1` e `upgrade head` sem erro; 13 prazos abertos e 8 internos finalizados, todos com `concluido_em` nulo.)*
- [x] **Ação:** no `/docs`, `PATCH /prazos/{id}` com `{"finalizado": true}` num prazo confirmado e aberto, depois `{"finalizado": true}` de novo, depois `{"finalizado": false}` → **Esperado:** 200 nos três; a 1ª grava `concluido_em`; a 2ª não muda a data; a 3ª limpa. *(Feito por script no `atualizar_prazo` e por HTTP real com token do responsável: `concluido_em` veio como `2026-11-04T12:01:15Z` e voltou a `null` ao desfazer; `concluido_em` no corpo do PATCH é ignorado.)*
- [x] **Ação:** no `/docs`, `{"finalizado": true}` num prazo "A conferir"; `{"finalizado": false}` num "Descartado"; `{"finalizado": false}` num Prazo Inicial antigo → **Esperado:** 400 nos três, com a mensagem da seção 5. *(Script no `atualizar_prazo`, 21/21 casos, mensagens conferidas; prazos de teste apagados depois.)*
- [x] **Ação:** no `/docs`, `{"situacao": "Descartado"}` num "A conferir" → **Esperado:** continua funcionando (200, `finalizado = true`, `concluido_em` nulo). *(Idem; descartar um prazo já cumprido também limpa a data.)*
- [x] **Ação:** pela tela, no processo `3000896-35.2024.8.06.0122` (ou outro com prazo vencido), marcar o prazo como cumprido → **Esperado:** etiqueta "✔ Cumprido em <hoje>"; Painel e Calendário sem o prazo; tabela com "✔ Prazo cumprido". *(Item A.)*
- [x] **Ação:** marcar como cumprido depois das 21h (horário de Brasília), ou conferir no banco um `concluido_em` perto da meia-noite UTC → **Esperado:** a tela mostra o dia de Brasília, não o dia seguinte. *(04/11, sem navegador: gravado `concluido_em` = 02:30 UTC (23:30 em Brasília) e lido pela API; o `dataCumprimento` real deu "03/11/2026", e 23:30 UTC deu "04/11/2026". Mesmo resultado com o computador em UTC, Tóquio e Los Angeles. Falta só olhar na tela, se quiser.)*
- [x] **Ação:** desfazer → **Esperado:** o prazo volta ao Painel e ao Calendário. *(Item A.)*
- [x] **Ação:** processo com prazo velho + "A conferir": marcar o velho como cumprido → **Esperado:** o "A conferir" fica em destaque e o Painel não mostra o velho. *(Idem.)*
- [x] **Ação:** entrar como ADMIN e como outro advogado → **Esperado:** sem botões / 403 no `PATCH`. *(O 403 do ADMIN e do outro advogado foi conferido por HTTP em 04/11; a ausência dos botões do ADMIN na tela foi confirmada em 04/11; a do outro advogado não dá para testar na tela, pois o processo assumido some da piscina dele.)*
- [x] **Ação:** em 390 px abrir o processo completo → **Esperado:** sem rolagem horizontal. *(Item D.)*

## 9. Perguntas em Aberto
- **Aviso para quem sobe a versão (Sávio):** a #106 foi aberta como "só falta o botão", mas **tem migration** (`e1f2a3b4c5d6`, coluna `prazos.concluido_em`). Ao subir esta versão, rodar `docker compose exec app alembic upgrade head`. O aviso também está no `CHANGELOG.md`. A migration só acrescenta uma coluna nula e tem `downgrade`.
- **Desvios na implementação (04/11):**
  - `finalizado = null` no `PATCH` agora dá 400 ("Informe se o prazo está finalizado."). Não estava na spec; sem isso, `null` tentaria gravar numa coluna que não aceita vazio e daria 500.
  - Descartar um prazo que já estava cumprido limpa o `concluido_em` (a spec só dizia que o descartado não preenche).
  - Aviso do React no teste manual ("Removing a style property during rerender (paddingTop) when a conflicting property is set (padding)"): `itemLinha` e `itemPiscina` usavam o atalho `padding` e `primeiraLinha` acrescentava `paddingTop`. A API não ordena os prazos e o banco devolve o atualizado no fim, então a linha deixava de ser a primeira ao cumprir ou confirmar. Corrigido com `paddingTop`/`paddingBottom` nos dois estilos e com a lista de prazos ordenada por "A conferir" primeiro e depois por `id` (o prazo também deixou de "pular" de lugar). Refeito o teste A e B em 04/11 (início 12:08), sem nada novo no Console.
  - O ESLint do `Dashboard.tsx` passou de 53 para 58 problemas, todos `no-explicit-any` nos helpers novos de prazo, no mesmo estilo do resto do arquivo. O `tsc` passa.
- Se o item 15 do `MELHORIAS.md` (status + `concluido_por_id`) for feito depois, "cumprido" deixa de ser `finalizado` + `Confirmado` e vira um status próprio; a função `cumprido()` fica num lugar só para facilitar essa troca, e o `concluido_em` desta spec já serve de base.
- O autor (`concluido_por_id`) fica de fora por enquanto. O Sávio concorda que, com um responsável por processo, quem marcou é deduzível?

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
