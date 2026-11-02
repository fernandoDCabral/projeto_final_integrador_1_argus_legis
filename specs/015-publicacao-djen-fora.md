# Spec 015: Manter a publicação do DJEN quando o DJEN está fora
**Status:** Implementada   **Data:** 2026-11-02
**Relacionadas:** Issue #109 · Spec 010 (data de publicação pelo DJEN), Spec 013 (atualizar todos pelo DJEN), Spec 014 (publicações do DJEN no processo)

## 1. Contexto
- **Como funciona hoje:**
  - `datajud_service.consultar_processo` consulta o DataJud e o DJEN. Se o DJEN falha (fora do ar ou 429 duas vezes), segue só com o DataJud e devolve `djen_respondeu = False` (Spec 013).
  - A rota `POST /processos/{id}/datajud` ("Atualizar processo", `app/routes/processos.py`) copia **sempre** para o processo os 6 campos de publicação da consulta (`data_publicacao`, `data_disponibilizacao`, `fonte_publicacao`, `tipo_publicacao`, `link_publicacao`, `hash_publicacao`) e o `peticao_apos_publicacao`, e recalcula o `prazo_estimado`. Ela só usa o `djen_respondeu` para gravar o `djen_consultado_em`.
  - A rota `POST /processos/{id}/djen` ("Atualizar todos") já não apaga nada quando o DJEN falha: devolve "erro" sem gravar.
- **Problema observado:** no processo `3000896-35.2024.8.06.0122`, a publicação gravada era a do DJEN (14/05/2026). Com o DJEN simulado fora do ar, o DataJud não tinha publicação e a data ficou **vazia**: somem a "Última publicação", os links do DJEN e o prazo estimado da piscina (teste da Spec 013, 02/11).

## 2. Objetivo
- **O que fazer:** no "Atualizar processo", quando o DJEN não responder, manter a publicação do DJEN que já estava gravada, a não ser que o DataJud traga uma mais nova.
- **Por que fazer:** o DataJud recebe os dados com semanas de atraso. Uma falha passageira do DJEN não pode trocar a publicação certa por uma mais velha, nem apagar o prazo estimado.

## 3. Decisões
- **Decidido:** manter os 6 campos de publicação quando **as três** condições valem: o DJEN não respondeu, a publicação gravada tem `fonte_publicacao = "DJEN"`, e o DataJud não trouxe publicação ou trouxe uma igual ou mais antiga. **Porque** é a sugestão da issue e cobre o caso sem mudar o resto da consulta.
- **Decidido:** se o DataJud trouxer uma publicação **mais nova** que a gravada, ela vale, mesmo com o DJEN fora. **Porque** é a regra da Spec 010: vale a mais recente.
- **Decidido:** ao manter a publicação, o `peticao_apos_publicacao` é recalculado com as movimentações novas do DataJud contra a `data_disponibilizacao` guardada, e o `prazo_estimado` é recalculado a partir da `data_publicacao` guardada (vazio se o processo estiver encerrado). **Porque** é a mesma conta da rota `/djen` (Spec 013), e as movimentações podem ter mudado.
- **Descartado:** usar a tabela `publicacoes` (Spec 014) como reserva. **Porque** as colunas do processo já guardam a última publicação do DJEN, e isso cobre também processos que ainda não têm linhas na tabela.
- **Descartado:** devolver erro no "Atualizar processo" quando o DJEN falha. **Porque** o resto do DataJud (movimentações, encerramento) continua útil.

## 4. Escopo
- **Arquivos a alterar/criar:** `app/routes/processos.py` (rota `atualizar_dados_datajud`), `CHANGELOG.md`, `specs/README.md`.
- **Fora de escopo:**
  - A consulta do cadastro (`GET /datajud/{cnj}`): o processo ainda não existe, não há o que manter.
  - A rota `/djen` (já trata a falha).
  - Avisar na tela que o DJEN não respondeu.
- **Restrições (não pode quebrar):**
  - Com o DJEN respondendo, tudo continua igual.
  - Classe, órgão, grau, ajuizamento, assuntos, movimentações, `datajud_atualizado_em`, encerramento e status continuam vindo do DataJud.
  - `djen_consultado_em` continua sem ser gravado quando o DJEN falha (Spec 013).
  - `gravar_publicacoes` e `criar_prazo_a_conferir` continuam sendo chamados (com o DJEN fora, a lista de publicações vem vazia e nada é apagado).

## 5. Diretrizes Técnicas
- Na rota, antes de copiar os campos de publicação, decidir se mantém:
  `manter = not dados_consulta["djen_respondeu"] and processo.fonte_publicacao == "DJEN" and processo.data_publicacao and (consulta.data_publicacao is None or consulta.data_publicacao <= processo.data_publicacao)`
- Se `manter`: não copia os 6 campos; `peticao_apos_publicacao` = existe movimentação com `codigo == CODIGO_PETICAO` e `data > processo.data_disponibilizacao` nas movimentações novas (mesma conta da rota `/djen`). Se não: copia como hoje.
- O cálculo do `prazo_estimado` passa a usar `processo.data_publicacao` (já com o valor certo, mantido ou novo) em vez de `consulta.data_publicacao`.
- Código simples, comentário curto citando (Spec 015).
- **Casos de borda:**
  - Gravada do DataJud (`fonte_publicacao = "DataJud"`) e DJEN fora: copia como hoje.
  - Processo sem publicação gravada e DJEN fora: copia como hoje.
  - `data_disponibilizacao` gravada nula com fonte DJEN (não deveria acontecer): `peticao_apos_publicacao = False`.

## 6. Etapas de Implementação
1. Ajustar `atualizar_dados_datajud` como na seção 5. Verificar: com o DJEN no ar, "Atualizar processo" no #24 continua com a publicação de 14/05/2026 (DJEN).
2. Bloquear o DJEN só no container do backend (`docker compose exec app sh -c 'echo "0.0.0.0 comunicaapi.pje.jus.br" >> /etc/hosts'`) e rodar os casos da seção 7. Desbloquear no fim (tirar a linha do `/etc/hosts`).
3. `CHANGELOG.md` e `specs/README.md`.

## 7. Critérios de Aceite
- [x] Dado o #24 com publicação do DJEN de 14/05/2026 (Intimação) e o DataJud sem publicação, quando o DJEN está fora e clico em "Atualizar processo", então continuam a data 14/05/2026, a fonte DJEN, o tipo, o link e o hash, e o `prazo_estimado` continua 05/06/2026.
- [x] Dado o mesmo cenário, quando atualizo, então as movimentações e o `datajud_atualizado_em` vêm do DataJud, e o `djen_consultado_em` não muda.
- [x] Dado um processo com publicação gravada do DataJud, quando o DJEN está fora e atualizo, então os campos de publicação vêm do DataJud, como hoje.
- [x] Dado o DJEN no ar, quando atualizo o #24, então o resultado é igual ao de antes desta spec.
- [x] Dado o DJEN fora, quando abro a aba DJEN do #24, então vejo as 8 publicações guardadas (caso 9 da Spec 014).

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é manual, pela API e pela tela.
### Manual
- [x] **Ação:** bloquear o DJEN no container, `POST /processos/24/datajud` e `select data_publicacao, fonte_publicacao, tipo_publicacao, link_publicacao is not null, hash_publicacao, prazo_estimado, djen_consultado_em from processos where id = 24` antes e depois → **Esperado:** iguais, menos nada.
- [x] **Ação:** com o DJEN bloqueado, `POST /processos/{id}/datajud` num processo com `fonte_publicacao = 'DataJud'` (os do escritório 9 são todos DJEN hoje: achar outro no banco local, ou trocar a fonte de um processo de teste pelo banco e restaurar no fim) → **Esperado:** campos de publicação vindos do DataJud.
- [x] **Ação:** na tela, com o DJEN bloqueado, abrir o #24 (prévia da piscina): "Atualizar processo" mantém a "Última publicação" com os links; a aba DJEN do processo completo mostra as 8 publicações.
- [x] **Ação:** desbloquear o DJEN e atualizar o #24 → **Esperado:** como antes.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
