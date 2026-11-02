# Spec 013: Atualizar todos pelo DJEN
**Status:** Implementada   **Data:** 2026-11-02
**Relacionadas:** Issue #99 · Spec 002 (revisão da contagem de prazos), Spec 010 (data de publicação pelo DJEN), Spec 011 (DataJud: resposta parcial e timeout) · Spec 012 (feedback visual na consulta; numeração: esta spec nasceu como 012 e virou 013 porque a do feedback entrou antes)

## 1. Contexto
- **Como funciona hoje:**
  - O DJEN só é consultado nos botões "Buscar processo" (cadastro) e "Atualizar processo" (um processo por vez), dentro de `datajud_service.consultar_processo`, que também consulta o DataJud (Spec 010).
  - Não existe rotina agendada no projeto nem botão para atualizar vários processos de uma vez. Se ninguém clica, a data de publicação fica parada.
  - **Piscina** (sem responsável): a publicação nova recalcula o `prazo_estimado`, que é só um palpite.
  - **Assumido:** o prazo que vale é a linha da tabela `prazos`, criada **só** ao assumir (`handleAssumirProcesso` no `Dashboard.tsx` faz o único `POST /prazos/`). Uma publicação nova muda `processos.data_publicacao`, mas não cria prazo. Não há como cadastrar um prazo novo num processo já assumido.
  - `djen_service.buscar_ultima_publicacao` devolve `None` tanto quando a API falha quanto quando não há publicação.
  - `verificar_acesso_ao_processo` (`app/utils/autorizacao.py`) só deixa o responsável mexer num processo assumido. O admin recebe 403.
  - O vencimento sai de `prazo_service.calcular_data_vencimento`: dias do tipo (`PRAZOS_POR_TIPO`: Civil 15, Criminal 10, Trabalhista 8, Administrativo 30), em dias úteis, ou corridos no Criminal.
- **Problema observado:** no processo `3000896-35.2024.8.06.0122`, o prazo cadastrado é de 05/06/2026 (publicação de 14/05), e as movimentações seguintes (petições de 18/07, 18/08 e 18/09; conclusão em 28/07) não geram publicação. Quando sair a intimação da decisão, o Argus só vai saber se alguém abrir o processo e clicar em "Atualizar processo". Mesmo assim o prazo novo não nasce: o advogado precisa lembrar de cada processo.

## 2. Objetivo
- **O que fazer:** um botão "Atualizar todos" que consulta o DJEN dos processos ativos da lista (Meus processos do advogado, ou todos do escritório para o admin) e mostra o progresso e o resultado por processo. Num processo assumido, a publicação nova cria um prazo "A conferir", que o advogado confirma, ajusta (dias) ou descarta.
- **Por que fazer:** o advogado atualiza tudo com um clique e vê na lista, sem abrir processo por processo, onde saiu publicação nova que ainda precisa de atenção.

## 3. Decisões
- **Decidido:** só a atualização pelo **número do processo**. **Porque** reaproveita o `djen_service` da Spec 010. A busca por OAB é quase uma funcionalidade nova (tela, UF da OAB no cadastro do usuário, LGPD).
- **Decidido:** **só botão, sem rotina automática.** **Porque** foi a escolha do Sávio: sem agendador nem preocupação de deploy, e quem clica vê o que deu certo e o que falhou.
- **Decidido:** o botão fica em **Meus processos** (advogado, os processos dele) e em **Processos do escritório** (admin, todos os ativos do escritório: piscina e assumidos). Encerrados ficam fora. **Porque** dois advogados atualizando a piscina fariam tarefa dobrada. Os processos da piscina são guardados uma vez por escritório, então o admin atualiza para todos.
- **Decidido:** o botão consulta **só o DJEN**. **Porque** leva ~1 s por processo, contra 6 a 35 s do DataJud (28 processos = menos de 1 min, contra 5 a 15 min), e o que muda o prazo é a publicação. O DataJud continua no "Atualizar processo" de cada processo.
- **Decidido:** a tela chama uma rota por processo, **um por vez**. **Porque** isso mostra o progresso ao vivo e respeita sozinho o limite do DJEN (20 seguidas, depois 429), sem rota de lote no backend.
- **Decidido:** o botão **pula** os processos consultados no DJEN **na última hora** e tem a caixinha **"Forçar atualização de todos"**. **Porque** foi a escolha do Sávio (opção 3) para não repetir consultas quando o admin e o advogado clicam no mesmo dia. Precisa da coluna nova `processos.djen_consultado_em`: `data_cadastro` não muda e `datajud_atualizado_em` é a data do tribunal no CNJ, não da consulta do Argus.
- **Decidido:** num processo **assumido** com publicação nova, o sistema **cria o prazo sozinho, com situação "A conferir"**, pelos dias do tipo do processo. **Porque** assim nada é esquecido (o prazo já está lá e conta no Painel) e nada vale sem conferência (a etiqueta só some quando o advogado resolve).
- **Decidido:** a etiqueta **"★ Nova publicação: confira o prazo"** aparece no cartão do processo enquanto houver prazo "A conferir", além do destaque na tela de resultado. **Porque** o Sávio pediu as duas coisas juntas: o aviso não pode sumir ao fechar a tela.
- **Decidido:** descartar **guarda** o prazo com situação "Descartado" (e `finalizado = true`). **Porque** fica o histórico de que a publicação foi vista, e o próprio prazo descartado impede que a próxima atualização crie o mesmo prazo de novo, sem coluna de "publicação vista". Com `finalizado = true`, os filtros que já existem (Painel, Calendário, `prazoAberto`) ignoram o descartado sem mudar.
- **Decidido:** o advogado ajusta o prazo pela **quantidade de dias** (o campo já vem com o padrão do tipo), e o vencimento é recalculado pelo `prazo_service`, com feriados. **Porque** é como o advogado pensa ("prazo de 5 dias") e evita erro de contagem na mão. No Criminal, a contagem continua em dias corridos (regra da Spec 002), e o rótulo do campo diz isso.
- **Decidido:** o prazo "A conferir" **já conta** no Painel e no Calendário. **Porque** mesmo sem confirmar, o advogado precisa ver o vencimento chegando.
- **Decidido:** o "Atualizar processo" individual segue a **mesma regra** (cria o prazo "A conferir" e grava `djen_consultado_em`). **Porque** o resultado não pode depender de qual botão foi usado.
- **Decidido:** o admin pode usar a rota do DJEN em qualquer processo do seu escritório, mas **não** confirma nem descarta prazo (`PATCH /prazos` continua só do ADVOGADO). **Porque** prazo é do advogado responsável.
- **Descartado:** rotina automática (dentro do backend, cron ou APScheduler). **Porque** o Sávio preferiu só o botão. Fica na seção 9.
- **Descartado:** botão também na Piscina para os advogados. **Porque** dois advogados fariam tarefa dobrada; o admin já cobre a piscina.
- **Descartado:** DJEN e DataJud no botão. **Porque** levaria vários minutos, e o DataJud cai com frequência.
- **Descartado:** só mostrar a etiqueta e o advogado clicar em "Cadastrar prazo". **Porque** depende de ele lembrar.
- **Descartado:** criar o prazo sozinho sem marcar "A conferir". **Porque** despacho sem prazo viraria prazo falso, e um prazo de 5 dias apareceria como 15.
- **Descartado:** apagar o prazo descartado. **Porque** a próxima atualização criaria o mesmo prazo de novo.
- **Descartado:** o advogado digitar a data de vencimento. **Porque** teria que contar dias úteis e feriados de cabeça.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `alembic/versions/<nova>_atualizar_todos_pelo_djen.py` (revisa `b8c9d0e1f2a3`):
    - `processos.djen_consultado_em` (DateTime com fuso, nulo);
    - `prazos.situacao` (String(20), não nulo, padrão `"Confirmado"`; os prazos que já existem viram `"Confirmado"`);
    - `prazos.dias` (Integer, nulo; nos prazos antigos fica nulo e a tela mostra o padrão do tipo).
  - `app/models/processo.py`, `app/models/prazo.py`: as colunas novas.
  - `app/schemas/prazo.py`: `situacao` e `dias` no `PrazoResponse`; `PrazoUpdate` aceita `situacao` e `dias`.
  - `app/schemas/processo.py`: `djen_consultado_em` no `ProcessoResponse`; resposta nova da rota do DJEN (`resultado` + processo).
  - `app/service/djen_service.py`: diferenciar "API falhou" de "não tem publicação" (ver seção 5).
  - `app/service/prazo_service.py`: `calcular_data_vencimento` aceita `dias` opcional; `atualizar_prazo` recalcula o vencimento quando `dias` muda; função que cria o prazo "A conferir" de um processo assumido.
  - `app/service/datajud_service.py`: tratar a falha do DJEN do jeito novo (continua seguindo só com o DataJud).
  - `app/routes/processos.py`: rota nova `POST /processos/{id}/djen?forcar=false`; o `POST /processos/{id}/datajud` grava `djen_consultado_em` e cria o prazo "A conferir".
  - `frontend/src/pages/Dashboard.tsx`: botão, caixinha e modal de progresso; etiqueta no cartão; prazo "A conferir" e "Descartado" no cartão Prazos.
- **Fora de escopo:**
  - Busca por OAB e rotina automática (seção 9).
  - Marcar prazo como **cumprido** ("já me manifestei"): spec própria, issue #106.
  - Mudar `PRAZOS_POR_TIPO`, a regra de feriados ou a contagem do Criminal.
  - Guardar o texto da intimação (LGPD, igual à Spec 010).
- **Restrições (não pode quebrar):**
  - `POST /processos/{id}/datajud` e `GET /datajud/{cnj}` mantêm o formato atual (só ganham campos).
  - Se o DJEN falhar, o "Buscar processo" e o "Atualizar processo" continuam funcionando só com o DataJud, como na Spec 010.
  - Os prazos que já existem continuam iguais (situação "Confirmado").
  - Processo de outro escritório continua respondendo 404 (Spec 008/009).

## 5. Diretrizes Técnicas
- Seguir o estilo atual: `urllib`, constantes no topo, código direto, comentários curtos em português.
- **`djen_service`:** quando a API falhar (erro HTTP, rede, timeout, resposta inesperada, 429 depois da nova tentativa), levantar uma exceção própria (ex.: `DjenIndisponivel`) em vez de devolver `None`. `None` passa a ser só "não tem publicação". O `consultar_processo` captura a exceção e segue só com o DataJud, como hoje.
- **Rota `POST /processos/{id}/djen`:**
  - Acesso: processo do mesmo escritório (senão 404); se for assumido, só o responsável ou um ADMIN do escritório.
  - Encerrado ou sem CNJ → 400.
  - Se `forcar` for falso e `djen_consultado_em` tiver menos de 1 hora (`MINUTOS_PARA_PULAR = 60`) → não consulta e devolve `resultado = "pulado"`.
  - DJEN falhou → `resultado = "erro"`, nada é gravado (nem `djen_consultado_em`). Responder 200 com o resultado, para a tela seguir para o próximo processo.
  - Sem publicação, ou publicação mais antiga que a guardada → `resultado = "sem_novidade"`, grava `djen_consultado_em`.
  - Publicação do DJEN **mais nova** que `processos.data_publicacao` (ou não havia data) → grava data, disponibilização, fonte, tipo, link e hash (igual à Spec 010), recalcula `prazo_estimado` e `peticao_apos_publicacao` (com as movimentações já salvas), grava `djen_consultado_em` e devolve `resultado = "nova_publicacao"`. A mesma data que a guardada conta como "sem novidade".
- **Prazo "A conferir"** (rota do DJEN e `POST /processos/{id}/datajud`): só em processo **assumido** e só se a `data_publicacao` do processo for **mais nova** que a do prazo mais recente dele (de qualquer situação). Descrição: `Publicação de 13/10/2026 (Intimação)`. `dias` = padrão do tipo; vencimento pelo `prazo_service`.
- **`PATCH /prazos/{id}`:**
  - `dias` (inteiro de 1 a 365) → grava e recalcula o vencimento a partir da `data_publicacao`.
  - `situacao = "Confirmado"` → tira a etiqueta.
  - `situacao = "Descartado"` → também grava `finalizado = true`.
  - Outra situação → 422.
- **Tela:**
  - Botão "Atualizar todos" e caixinha "Forçar atualização de todos" no topo de Meus processos (advogado) e de Processos do escritório (admin). A lista enviada é a dos processos **ativos** da tela.
  - Modal: "Atualizando pelo DJEN... 12 de 28", barra de progresso e uma linha por processo (★ nova publicação, ✔ sem novidade, – pulado com a hora, ✖ DJEN não respondeu).
  - No fim: resumo por resultado, os ★ no topo com "Abrir processo", botões "Tentar de novo os com erro" e "Fechar". Fechar recarrega a lista; fechar no meio para depois do processo atual.
  - Cartão do processo (Meus processos, Processos do escritório e Painel): etiqueta "★ Nova publicação: confira o prazo" se houver prazo "A conferir".
  - Cartão Prazos (tela completa): o "A conferir" fica em destaque, com a linha da publicação e os links do DJEN, o campo "Dias úteis" (Criminal: "Dias corridos") com o vencimento recalculado e os botões "Confirmar prazo" e "Descartar (não gera prazo)". O "Descartado" aparece em cinza e riscado: "Descartado: publicação de 13/10/2026".
  - Tem que funcionar em 390 px sem rolagem horizontal.
- **Casos de borda:**
  - Advogado digitou 15/05 ao assumir e o DJEN diz 14/05 → não cria prazo (14/05 não é mais nova).
  - Atualizar duas vezes seguidas → a 2ª pula tudo; com "Forçar", consulta, mas não cria prazo repetido.
  - Prazo "A conferir" descartado e nova atualização com a mesma publicação → não cria de novo.
  - DJEN fora do ar → todos ✖, nada gravado; "Tentar de novo" não pula ninguém.
  - 429 → o `djen_service` já espera e tenta 1 vez; se falhar de novo, ✖.
  - Processo devolvido à piscina com prazo "A conferir" → o prazo fica como está (igual aos outros prazos ao liberar).
  - Dois cliques ao mesmo tempo no mesmo processo → pode duplicar o prazo "A conferir"; o advogado descarta o repetido. Não tratar agora (seção 9).

## 6. Etapas de Implementação
1. Migration e models (`djen_consultado_em`, `situacao`, `dias`). → `alembic upgrade head` roda, os prazos antigos ficam "Confirmado", e o `downgrade` volta.
2. `djen_service` com a exceção e `consultar_processo` tratando ela. → "Atualizar processo" continua igual; com o DJEN simulado fora do ar, segue só com o DataJud.
3. `prazo_service`: `dias` no cálculo, `atualizar_prazo` e a criação do prazo "A conferir". → no shell, criar e ajustar um prazo de 15 para 5 dias recalcula o vencimento.
4. Rota `POST /processos/{id}/djen` e a mesma regra no `POST /processos/{id}/datajud`. → no `/docs`, os quatro resultados (`nova_publicacao`, `sem_novidade`, `pulado`, `erro`) com a simulação da seção 8.
5. `PATCH /prazos` com `situacao` e `dias`. → no `/docs`, confirmar, descartar e trocar os dias.
6. Tela: botão, caixinha e modal de progresso. → em Meus processos e em Processos do escritório, o progresso e o resumo aparecem.
7. Tela: etiqueta no cartão e o prazo "A conferir"/"Descartado" no cartão Prazos. → confirmar, ajustar e descartar pela tela.

## 7. Critérios de Aceite
- [x] Dado um advogado com 3 processos ativos, quando clica em "Atualizar todos" em Meus processos, então vê "Atualizando pelo DJEN... 1 de 3" até "3 de 3" e um resumo com o resultado de cada processo.
- [x] Dado um processo **da piscina** cuja publicação guardada é 14/05/2026 e o DJEN tem uma disponibilização de 09/10/2026, quando o admin atualiza, então a publicação passa a 13/10/2026, o `prazo_estimado` é recalculado e **nenhum** prazo é criado.
- [x] Dado um processo **assumido** (Civil) com prazo de publicação 14/05/2026 e o DJEN com disponibilização de 09/10/2026, quando atualizo, então nasce um prazo "A conferir" com `Publicação de 13/10/2026 (Intimação)`, 15 dias úteis, e o cartão mostra "★ Nova publicação: confira o prazo".
- [x] Dado esse prazo "A conferir", quando troco os dias de 15 para 5, então o vencimento é recalculado para o 5º dia útil depois de 13/10/2026, pulando feriados.
- [x] Dado esse prazo, quando clico em "Confirmar prazo", então a etiqueta some e o prazo continua contando no Painel.
- [x] Dado esse prazo, quando clico em "Descartar", então ele fica cinza e riscado, sai do Painel e do Calendário, e uma nova atualização forçada **não** cria outro prazo para 13/10/2026.
- [x] Dado que atualizei há 10 minutos, quando clico em "Atualizar todos" sem forçar, então os processos aparecem como "– pulado (atualizado às HH:MM)" e o DJEN não é chamado; marcando "Forçar", eles são consultados.
- [ ] Dado que o DJEN está fora do ar, quando atualizo, então cada processo aparece com "✖ DJEN não respondeu", nada muda no banco, e "Tentar de novo os com erro" consulta esses processos de novo. *(Simulado no backend (504 e 429 x2 → `erro`, nada gravado). Pela tela não foi testado: o DJEN não caiu.)*
- [x] Dado um admin, quando clica em "Atualizar todos" em Processos do escritório, então são atualizados os processos ativos da piscina e os assumidos, sem 403; mas ele não vê os botões de confirmar ou descartar prazo.
- [x] Dado um processo assumido por outro advogado, quando um advogado chama `POST /processos/{id}/djen`, então recebe 403; processo de outro escritório → 404.
- [x] Dado um processo assumido com publicação nova, quando clico em "Atualizar processo" (individual), então também nasce o prazo "A conferir".
- [x] Dado os 28 processos ativos do escritório 1, quando o admin atualiza todos com "Forçar", então nenhum termina em ✖ por causa do limite do DJEN. *(O escritório 1 tem 7 ativos; 28 chamadas seguidas repetindo os 7 CNJs, só leitura: 56/56 ok em duas rodadas, um 429 por rodada resolvido com a espera de 5 s.)*
- [x] Dado uma tela de 390 px, quando abro o modal e o cartão Prazos, então não há rolagem horizontal.

## 8. Testes e Validação
### Automatizados
- O projeto ainda **não tem pasta de testes automatizados**. A validação é manual, abaixo.
### Manual
- [x] **Ação:** no shell do container (`docker compose exec app python`), trocar `urllib.request.urlopen` dentro do `djen_service` por uma função falsa (publicação nova, sem itens, erro 504, 429 duas vezes) e chamar a rota do DJEN para um processo da piscina e um assumido → **Esperado:** os resultados da seção 5, conferindo o banco depois de cada caso.
- [x] **Ação:** `alembic upgrade head`, conferir `select situacao, count(*) from prazos group by situacao`, depois `downgrade -1` e `upgrade head` de novo → **Esperado:** todos "Confirmado"; o downgrade e o upgrade rodam sem erro.
- [x] **Ação:** no `/docs`, `PATCH /prazos/{id}` com `dias = 5`, depois `situacao = "Confirmado"` e, em outro prazo, `situacao = "Descartado"` → **Esperado:** vencimento recalculado; descartado com `finalizado = true`; `situacao = "Outra"` → 422.
- [x] **Ação:** pela tela (Testador), "Atualizar todos" em Meus processos (advogado) e em Processos do escritório (admin), duas vezes seguidas, com e sem "Forçar" → **Esperado:** progresso, resumo e pulados como na seção 7.
- [x] **Ação:** pela tela, num processo com prazo "A conferir": trocar os dias, confirmar; em outro, descartar → **Esperado:** etiqueta some; descartado cinza e riscado; Painel e Calendário certos.
- [x] **Ação:** pela tela, "Buscar processo" no cadastro e "Atualizar processo" num processo → **Esperado:** funcionam como antes; com publicação nova num assumido, nasce o prazo "A conferir". *("Atualizar processo" testado pela tela; o prazo "A conferir" pelo `POST /processos/{id}/datajud` foi validado pelo Pedreiro com DataJud real.)*
- [x] **Ação:** em 390 px, abrir o modal de progresso e o cartão Prazos → **Esperado:** sem rolagem horizontal.
- [x] **Ação:** `docker compose logs app` depois de atualizar os 28 processos com "Forçar" → **Esperado:** nenhum erro; avisos de 429, se houver, seguidos de sucesso. *(28 chamadas seguidas, só leitura: nenhum traceback; um aviso de 429 por rodada, seguido de sucesso.)*

## 9. Perguntas em Aberto
- **Desvios na implementação (02/11):**
  - O admin não tem "Abrir processo" na janela de resultado, porque não tem tela de processo completo.
  - Processos sem CNJ ficam fora da lista do "Atualizar todos" (dariam 400).
  - O prazo criado ao assumir continua com `dias = null`; a tela mostra o padrão do tipo.
  - Na rota do DJEN, o resultado é `nova_publicacao` também quando a consulta cria um prazo "A conferir" sem a data mudar (o processo já tinha a publicação, mas não o prazo).
  - **429 do DJEN:** o `Retry-After` não é confiável (veio 0, -1 e curto demais em 02/11); o `djen_service` passou a esperar sempre 5 s antes da nova tentativa. Com Retry-After negativo, o código antigo (Spec 010) dava `ValueError` e derrubava a consulta.
- **Achado no teste, fora desta spec:** com o DJEN fora do ar, o "Atualizar processo" grava só o que o DataJud tem e pode apagar uma publicação que veio do DJEN (regra da Spec 010).
- Na lista de Meus processos, a coluna Prazo mostra o prazo em aberto que vence primeiro; o prazo antigo vencido aparece junto da etiqueta ★ até ser marcado como cumprido (#106).
- **Rotina automática** (ex.: uma vez por dia de madrugada): ficou de fora por escolha do Sávio. Se voltar, lembrar que, rodando dentro do backend, cada cópia da API rodaria a rotina (ponto para o deploy, #86).
- **Busca por OAB** (`numeroOab` + `ufOab`): spec própria. Precisa separar número e UF da OAB no cadastro do usuário (hoje é texto livre: `123456/CE`, `CE00000`, vazio nos admins).
- **Marcar prazo como cumprido:** spec própria, issue #106. Usa a coluna `finalizado` que já existe.
- Dois cliques ao mesmo tempo no mesmo processo podem duplicar o prazo "A conferir". Raro; tratar só se acontecer.
- Possível bloqueio de IP de fora do Brasil no DJEN (403): conferir no deploy (#86).

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
