# Spec 016: Marcar prazo como cumprido
**Status:** Implementada   **Data:** 2026-11-02
**Relacionadas:** Issue #106 · Spec 002 (revisão da contagem de prazos), Spec 013 (prazo "A conferir"), issue #99

## 1. Contexto
- **Como funciona hoje:**
  - A tabela `prazos` tem a coluna `finalizado`. Hoje ela é `true` em dois casos: os Prazos Iniciais antigos (`interno = true`, finalizados por migration na Spec 002) e os prazos descartados (`situacao = "Descartado"`, Spec 013, que `prazo_service.atualizar_prazo` finaliza sozinho).
  - O `PATCH /prazos/{id}` já aceita `finalizado`, sem nenhuma regra: daria para "desdescartar" um prazo ou finalizar um "A conferir".
  - A tela já ignora prazo finalizado no Painel (resumo, próximos prazos), no Calendário, na faixa do processo completo e na etiqueta de "Meus processos" (`prazoAberto` e `prazosAbertos` filtram `!prazo.finalizado`).
  - No cartão Prazos (`renderListaPrazos`, prévia e processo completo), o prazo finalizado mostra a etiqueta cinza "Finalizado". Não existe botão para finalizar.
- **Problema observado:** o advogado não tem como dizer que já cumpriu um prazo. No processo #25 da Conta de teste, o prazo de 19/10/2026 aparece "Vencido há 14 dias" no Painel, no Calendário e em "Meus processos", mesmo que a peça já tenha sido protocolada. No processo real `3000896-35.2024.8.06.0122`, o prazo de 05/06/2026 aparece vencido, mas há petição de 18/07.

## 2. Objetivo
- **O que fazer:** botão "Marcar como cumprido" (e "Desfazer") no cartão Prazos do processo completo. O prazo cumprido mostra a etiqueta "Cumprido" e sai do Painel e do Calendário.
- **Por que fazer:** o advogado bate o olho e sabe o que ainda falta, sem prazo já resolvido aparecendo como vencido.

## 3. Decisões
- **Decidido:** cumprido = `finalizado = true` num prazo `Confirmado` e não interno. Sem coluna nova e sem migration. **Porque** o Painel, o Calendário e a lista já tiram o finalizado, e as três situações (antigo, descartado, cumprido) se distinguem pelo `interno` e pela `situacao`.
- **Decidido:** a etiqueta diz "Cumprido" no prazo cumprido. O Prazo Inicial antigo continua "Finalizado". **Porque** "Finalizado" não diz ao advogado o que aconteceu.
- **Decidido:** só prazo `Confirmado` pode ser marcado como cumprido (ou desfeito). O "A conferir" precisa ser confirmado antes. **Porque** evita cumprir um prazo com os dias ainda não conferidos.
- **Decidido:** o backend recusa mudar o `finalizado` de prazo que não seja `Confirmado` e não interno, com 400 "Só prazo confirmado pode ser marcado como cumprido.". **Porque** hoje o PATCH deixa "desdescartar" ou finalizar um "A conferir" por fora da tela.
- **Decidido:** botão só no cartão Prazos do processo completo, só para o responsável (mesmo `podeConferir` do "A conferir"). Na prévia da piscina aparece só a etiqueta. **Porque** é o pedido da issue, e o ADMIN não chega ao processo completo.
- **Decidido:** em "Meus processos", processo sem prazo em aberto (todos cumpridos) mostra "Sem prazo", como já acontece hoje. **Porque** a coluna mostra o que falta, e o cumprido aparece no cartão do processo.
- **Descartado:** situação nova "Cumprido" e coluna `cumprido_em` (data em que marcou). **Porque** precisa de migration e ninguém pediu a data agora.
- **Descartado:** botão também nos "Próximos prazos" do Painel. **Porque** a issue pede na tela do processo; dá para acrescentar depois.

## 4. Escopo
- **Arquivos a alterar/criar:** `app/service/prazo_service.py` (`atualizar_prazo`), `frontend/src/pages/Dashboard.tsx` (`renderListaPrazos` e a função que manda o PATCH), `CHANGELOG.md`, `specs/README.md`.
- **Fora de escopo:**
  - Data e autor de quando foi cumprido.
  - Ligar o cumprido a uma peça ou a uma movimentação de petição do DataJud (marcar sozinho).
  - Prazo "A conferir" e "Descartado": continuam como na Spec 013.
  - A estimativa da piscina (`prazo_estimado`), que não é prazo.
- **Restrições (não pode quebrar):**
  - Confirmar, ajustar os dias e descartar o "A conferir" (Spec 013) continuam iguais.
  - Assumir processo continua criando o prazo com `finalizado: false`.
  - `criar_prazo_a_conferir` continua olhando todos os prazos (inclusive os cumpridos) para não criar de novo.
  - Os Prazos Iniciais antigos continuam "Finalizado", sem botão.

## 5. Diretrizes Técnicas
- **Backend**, no começo do `atualizar_prazo`, antes do "Descartado finaliza":
  `if "finalizado" in dados_dict and (prazo.situacao != "Confirmado" or prazo.interno): raise HTTPException(400, "Só prazo confirmado pode ser marcado como cumprido.")`
  O descarte não manda `finalizado` (a tela manda só `situacao`), então não cai nessa regra.
- **Frontend**, em `renderListaPrazos`, no prazo Confirmado e não interno:
  - etiqueta: `finalizado` → "Cumprido" (cinza, `neutro`); interno finalizado → "Finalizado" como hoje;
  - se `podeConferir`: botão pequeno "Marcar como cumprido" no prazo aberto e "Desfazer" no cumprido, no estilo dos botões do cartão (`btnMiniNeutro`);
  - o clique faz `PATCH /prazos/{id}` com `{ finalizado: true | false }` e atualiza o processo aberto e a lista, como já faz o confirmar prazo (`handleAtualizarPrazo`);
  - erro aparece no próprio cartão (`erroPrazo`), como no confirmar.
- Código simples, comentário curto citando (Spec 016).
- **Casos de borda:**
  - Processo com dois prazos abertos: cumprir o mais próximo faz a faixa e a lista mostrarem o próximo.
  - Desfazer um prazo que já venceu: volta a aparecer como vencido no Painel e no Calendário.
  - Processo encerrado: nada muda (já sai do Painel pelo status).
  - "A conferir" com prazo cumprido antes dele: continua aparecendo para conferir.

## 6. Etapas de Implementação
1. Regra no `atualizar_prazo`. Verificar: `PATCH /prazos/{id}` com `{"finalizado": true}` num Confirmado → 200; num "A conferir" ou Descartado → 400 com a mensagem.
2. Etiqueta "Cumprido" e botões no cartão Prazos. Verificar na tela, no processo #25 da Conta de teste.
3. `CHANGELOG.md` e `specs/README.md`.

## 7. Critérios de Aceite
- [x] Dado o processo #25 com o prazo de 19/10/2026 aberto ("Vencido há 14 dias" em 02/11/2026), quando o responsável clica em "Marcar como cumprido", então o prazo mostra "Cumprido" e o botão vira "Desfazer".
- [x] Dado o mesmo prazo cumprido, quando abro o Painel e o Calendário, então ele não aparece no resumo, nos próximos prazos nem no dia 19/10.
- [x] Dado o mesmo prazo cumprido e nenhum outro aberto, quando abro "Meus processos" e o processo completo, então a coluna Prazo mostra "Sem prazo" e a faixa mostra "Sem prazo em aberto".
- [x] Dado o prazo cumprido, quando clico em "Desfazer", então ele volta a "Vencido há 14 dias" e reaparece no Painel e no Calendário.
- [ ] Dado um prazo "A conferir", quando abro o processo completo, então não aparece "Marcar como cumprido" nele; e `PATCH /prazos/{id}` com `{"finalizado": true}` devolve 400 "Só prazo confirmado pode ser marcado como cumprido.".
- [x] Dado um prazo Descartado, quando mando `PATCH /prazos/{id}` com `{"finalizado": false}`, então recebo 400 com a mesma mensagem.
- [ ] Dado um prazo cumprido, quando abro a prévia do processo, então vejo a etiqueta "Cumprido" e nenhum botão.

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é manual, pela API e pela tela.
### Manual
- [x] **Ação:** na Conta de teste (escritório 9), `PATCH /prazos/27` com `{"finalizado": true}` e depois `{"finalizado": false}` → **Esperado:** 200 nas duas; `select finalizado from prazos where id = 27` acompanha.
- [x] **Ação:** criar um "A conferir" e um Descartado só para o teste (ou achar no banco do escritório 9) e mandar `PATCH` com `finalizado` → **Esperado:** 400 com a mensagem. Apagar o que foi criado no fim.
- [x] **Ação:** na tela, como o advogado responsável pelo #25: marcar o prazo de 19/10 como cumprido, conferir Painel, Calendário, "Meus processos" e faixa; desfazer e conferir de novo → **Esperado:** como nos critérios da seção 7.
- [x] **Ação:** deixar o prazo 27 como estava antes do teste (`finalizado = false`).

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
