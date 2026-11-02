# Spec 012: Feedback visual na consulta ao DataJud
**Status:** Implementada   **Data:** 2026-10-19
**Relacionadas:** [Spec 001 — Detectar processo encerrado](001-detectar-processo-encerrado.md) · [Spec 007 — Nova identidade visual](007-nova-identidade-visual.md)

## 1. Contexto
- **Como funciona hoje:** o advogado consulta o DataJud em dois botões que chamam o mesmo `handleAtualizarDatajud` e usam o mesmo estado `atualizandoDatajud` (`Dashboard.tsx` ~linha 277):
  - **prévia da piscina** (a janela do "Assumir"): botão "Buscar processo" / "Atualizar processo" (~linha 1556, `styles.btnMiniNeutro`);
  - **processo completo**: botão "Buscar processo" / "Atualizar processo" no cabeçalho (~linha 1419, `styles.btnAcaoBase`).

  Enquanto a chamada `POST /processos/{id}/datajud` não responde, o botão só fica `disabled` e o texto troca para "Consultando...". O backend espera o DataJud por até 20 s (`TIMEOUT_SEGUNDOS` em `app/service/datajud_service.py`).
- **Problema observado:** não há nenhum movimento na tela durante a espera. O botão parece travado, e o usuário não sabe se deve esperar ou clicar de novo. O frontend não tem nenhuma animação hoje (nenhum `@keyframes`).

## 2. Objetivo
- **O que fazer:** mostrar um indicador de carregamento (círculo girando dentro do botão) enquanto o DataJud é consultado, e uma frase de apoio se a consulta demorar.
- **Por que fazer:** a espera pode chegar a vários segundos e o usuário precisa saber que o sistema está trabalhando.

## 3. Decisões
- **Decidido:** **círculo girando (spinner) dentro do botão**, ao lado do texto — **porque** fica no lugar onde o usuário acabou de clicar e dá a ideia de "em andamento" sem ocupar a tela.
- **Decidido:** o spinner é feito só com **CSS** (`border` + `@keyframes`) em `index.css`, com a cor herdada do texto do botão (`currentColor`) — **porque** funciona nos dois botões (um claro sobre petróleo, outro escuro sobre branco), sem imagem e sem biblioteca, como pede a Spec 007.
- **Decidido:** **frase de apoio** logo abaixo do botão depois de 5 s de espera: "Está demorando mais que o normal. Aguarde." — **porque** evita a sensação de travamento sem prometer um tempo. Fica fora do botão para não quebrar o cabeçalho do processo completo.
- **Decidido:** botão com `aria-busy="true"` durante a consulta e uma região `role="status"` que anuncia "Consultando o DataJud..." — **porque** a Spec 007 pede acessibilidade, e a troca de texto do botão sozinha não é anunciada por leitor de tela.
- **Decidido:** com `prefers-reduced-motion: reduce` o círculo some e fica só o texto "Consultando..." — **porque** respeita quem desliga animações no sistema.
- **Decidido:** botão desabilitado durante a consulta ganha `opacity: 0.7` e `cursor: "wait"` — **porque** hoje o `disabled` não muda o visual.
- **Decidido (após o teste manual):** dentro da prévia, o erro da consulta aparece **logo abaixo do botão**, num estado próprio `erroConsultaPrevia` — **porque** o `erroPrevia` fica no fim da janela, depois de Prazos e Peças, e o usuário não via o que aconteceu. O `erroPrevia` continua só para o erro de "Assumir processo", que fica perto do botão do rodapé.
- **Descartado:** mover o erro do processo completo (faixa `aviso`) para perto do botão — **porque** não foi apontado como problema.
- **Descartado:** tela ou janela bloqueando tudo (overlay) — **porque** a consulta já acontece dentro de uma janela (a prévia) e bloquear atrapalha mais do que ajuda.
- **Descartado:** barra de progresso — **porque** a API não informa progresso, e uma barra falsa engana o usuário.
- **Descartado:** biblioteca de animação ou de spinner — **porque** o projeto não usa biblioteca de UI (Spec 007) e é só um círculo.
- **Descartado:** mexer no botão "Buscar processo" do cadastro de processo do ADMIN — **porque** é outro fluxo (estado `buscandoDatajud`, `GET /datajud/{cnj}`, libera o "Cadastrar") e ficou de fora por decisão do Victor; fica como possível evolução.

## 4. Escopo
- **Arquivos a alterar/criar:** `frontend/src/index.css` (classe do spinner e regra de movimento reduzido) e `frontend/src/pages/Dashboard.tsx`.
- **Fora de escopo:**
  - botão "Buscar processo" do cadastro de processo (ADMIN, `buscandoDatajud`, ~linha 1328);
  - backend (rota, serviço, timeout de 20 s, schemas, migration);
  - indicador de carregamento de outras ações (CEP, envio de peça, assumir, listas);
  - o que acontece com os dados depois da consulta.
- **Restrições (não pode quebrar):** o comportamento de `handleAtualizarDatajud` (atualiza `piscinaProcessos`, `meusProcessos`, a prévia e o processo aberto); o texto das mensagens de erro atuais (padrão "Não foi possível consultar o processo." ou o `detail` do backend), na faixa `aviso` fora da prévia; dentro da prévia só muda o lugar (ver Decisões); os textos dos botões quando não está consultando; o `role="status"` da faixa de prazo (~linha 1427).

## 5. Diretrizes Técnicas
- `index.css`: classe `.spinner` — `display: inline-block`, 14 px por 14 px, `border: 2px solid currentColor`, `border-right-color: transparent`, `border-radius: 50%`, `animation: girar 0.8s linear infinite`. `@keyframes girar` com `to { transform: rotate(360deg); }`. Dentro de `@media (prefers-reduced-motion: reduce)`, `.spinner { display: none; }`.
- `Dashboard.tsx`:
  - estado novo `consultaDemorada` (boolean), mais um `useEffect` que depende de `atualizandoDatajud`: quando vira `true`, agenda `setTimeout(() => setConsultaDemorada(true), 5000)`; quando vira `false` (ou no cleanup), cancela o timer e volta `consultaDemorada` para `false`. Sem biblioteca;
  - nos dois botões, dentro do texto: `{atualizandoDatajud && <span className="spinner" aria-hidden="true" />}` antes do "Consultando...", e `aria-busy={atualizandoDatajud}` no `<button>`. Os botões já têm `display: inline-flex` ou podem ganhar `gap`;
  - uma função pequena `renderStatusDatajud()` (mesmo padrão `render*` do arquivo) devolvendo `<div role="status">` **sempre renderizado**, com o texto "Consultando o DataJud..." enquanto `atualizandoDatajud`, a frase de apoio quando `consultaDemorada`, e vazio fora disso — **porque** leitor de tela só anuncia mudança dentro de uma região que já existe. Usada logo abaixo de cada um dos dois botões, com `styles.textoSecundario`, `width: 0` e `minWidth: "100%"` — **porque** no cabeçalho do processo completo (`flex-wrap`) a frase de apoio, mais longa que o botão, alargava o contêiner e empurrava o botão para baixo de "Liberar para a piscina" (achado no teste manual); assim o texto quebra na largura do botão e nada muda de lugar;
  - estado novo `erroConsultaPrevia` (string): `handleAtualizarDatajud` o limpa ao começar e o preenche no `catch` quando `processoEmPrevia` existe (no lugar de `setErroPrevia`); `abrirPrevia` também o limpa. Renderizado logo depois de `renderStatusDatajud()` na prévia, com `styles.avisoInline` e `role="alert"`. Fora da prévia continua `setAviso`;
  - não criar componente em arquivo novo.
- Como os dois botões compartilham `atualizandoDatajud`, os dois mostram o spinner juntos se estiverem na tela ao mesmo tempo. Hoje isso não acontece (a prévia e o processo completo não abrem juntos), então não se trata.
- **Casos de borda:**
  - consulta rápida (menos de 5 s) → spinner aparece e some, a frase de apoio nunca aparece;
  - consulta que estoura o tempo (erro) → spinner e frase somem e o erro aparece abaixo do botão na prévia (`erroConsultaPrevia`) e na faixa `aviso` na tela;
  - consulta que dá certo → spinner some e os dados novos aparecem, sem frase de apoio sobrando;
  - sair do processo ou fechar a prévia no meio da consulta → o timer é cancelado no cleanup do `useEffect` (não pode ficar timer solto nem aviso de atualização de estado);
  - clicar de novo durante a consulta → continua impossível (`disabled`).

## 6. Etapas de Implementação
1. Classe `.spinner`, `@keyframes girar` e a regra de movimento reduzido em `index.css`. → `npm run build` passa.
2. Spinner, `aria-busy` e `opacity`/`cursor` de desabilitado nos dois botões. → clicar em "Buscar processo" e ver o círculo girando.
3. Estado `consultaDemorada` + `useEffect` do timer de 5 s. → com rede lenta, a frase aparece depois de 5 s.
4. `renderStatusDatajud()` abaixo dos dois botões. → o texto "Consultando o DataJud..." aparece e some junto com o spinner.
5. `erroConsultaPrevia` abaixo do botão da prévia. → com a rede "Offline", a mensagem de erro aparece logo abaixo do botão.

## 7. Critérios de Aceite
- [x] Dado a prévia da piscina aberta, quando clica em "Buscar processo" (ou "Atualizar processo"), então o botão mostra um círculo girando ao lado de "Consultando..." e fica desabilitado.
- [x] Dado o processo completo, quando clica em "Buscar processo" (ou "Atualizar processo"), então o botão do cabeçalho mostra o círculo girando ao lado de "Consultando...".
- [x] Dado uma consulta que passa de 5 s, então aparece abaixo do botão "Está demorando mais que o normal. Aguarde." sem mexer no layout do cabeçalho. *Reconfirmado em 2026-11-01 depois da correção de `width: 0` / `minWidth: "100%"`: o botão ficou ao lado de "Liberar para a piscina".*
- [x] Dado uma consulta que termina (certo ou erro), então o círculo e a frase somem; no erro, a mensagem aparece logo abaixo do botão (na prévia) ou na faixa (no processo completo).
- [x] Dado a prévia aberta e uma consulta que dá erro, então a mensagem aparece logo abaixo do botão, visível sem rolar a janela, e o erro de "Assumir processo" continua no fim da janela.
- [x] Dado `prefers-reduced-motion: reduce` ativo, quando consulta, então não há círculo girando e o botão mostra só "Consultando...".
- [x] Dado um leitor de tela (ou o inspetor), então o botão tem `aria-busy="true"` durante a consulta e a região `role="status"` traz o texto "Consultando o DataJud...".
- [x] Dado o ADMIN no cadastro de processo, quando clica em "Buscar processo", então o botão se comporta como antes (só "Buscando...", sem círculo). *Confirmado em 2026-11-01: botão opaco e desabilitado com CNJ incompleto; ao buscar, "Buscando..." sem círculo e dados do DataJud abaixo; com latência de 8 s, sem a frase "Está demorando...".*
- [x] Dado qualquer consulta que dá certo, então os dados do processo atualizam como antes (movimentações, prazo estimado, data de publicação sugerida). *Confirmado em 2026-11-01 no processo 20, com os dados limpos antes: `datajud_atualizado_em` e `data_publicacao` preenchidas, `fonte_publicacao = DataJud`, 43 movimentações gravadas. O `prazo_estimado` ficou NULL porque o processo está encerrado (regra da Spec 001); ele não foi validado com processo ativo, por falta de um para teste.*

## 8. Testes e Validação
### Automatizados
- O projeto não tem testes automatizados de frontend. Só o build:
- [x] `npm run build` em `frontend/` passa sem erro (dentro do container: `docker compose exec frontend npm run build`).
### Manual
- [x] **Ação:** como ADVOGADO, abrir um processo da piscina com CNJ e clicar em "Buscar processo" → **Esperado:** círculo girando, botão desabilitado, depois os dados. *Confirmado em 2026-11-01 na prévia (testes com latência de 8 s e dos dados gravados).*
- [x] **Ação:** o mesmo no processo completo → **Esperado:** o mesmo, no botão do cabeçalho. *Confirmado em 2026-11-01: círculo girando ao lado de "Consultando...", botão desabilitado, "Consultando o DataJud..." abaixo do botão, e ao terminar tudo some e os dados novos aparecem. Duplo clique rápido gerou um único POST; `aria-busy="true"` durante a consulta e `<div role="status">` vazio antes do clique; botão parado sem opacidade; erro offline na faixa `aviso`.*
- [x] **Ação:** no DevTools (Network), pôr "Slow 3G" e repetir → **Esperado:** passados 5 s, a frase de apoio aparece abaixo do botão. *Confirmado em 2026-11-01 na prévia, com perfil custom "Latência 8s" (latência de 8000 ms, porque o Slow 3G pode não passar de 5 s): círculo girando e botão desabilitado; o texto trocou de "Consultando o DataJud..." para "Está demorando mais que o normal. Aguarde." e, quando a resposta chegou, círculo e frase sumiram, o botão voltou ao normal e não sobrou mensagem.*
- [x] **Ação:** no DevTools (Network), pôr "Offline" e clicar → **Esperado:** o círculo some e o erro aparece logo abaixo do botão (na prévia). *Confirmado em 2026-11-01: requisição `(failed) net::ERR_INTERNET_DISCONNECTED`; círculo e texto de apoio sumiram, botão voltou a "Atualizar processo" e "Não foi possível consultar o processo." apareceu abaixo do botão.*
- [x] **Ação:** na prévia, deixar a data de publicação vazia e clicar em "Assumir processo" → **Esperado:** o erro "Informe a data da publicação para assumir." continua no fim da janela, e nenhum erro aparece abaixo do botão de consultar.
- [x] **Ação:** DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" e clicar → **Esperado:** sem círculo, só "Consultando...". *Confirmado em 2026-11-01: com "reduce" o botão ficou opaco com só "Consultando..."; com "No emulation" o círculo voltou a girar (controle).*
- [x] **Ação:** fechar a prévia no meio da consulta → **Esperado:** nada quebra e não aparece erro no console. *Confirmado em 2026-11-01, com o perfil "Latência 8s": fechada a prévia logo após o clique, o console não mostrou nenhuma mensagem nova em 15 s e o botão ficou habilitado para novas consultas. A prévia reabriu quando a resposta chegou (comportamento anterior, ver Perguntas em Aberto).*
- [x] **Ação:** como ADMIN, "Novo processo" → "Buscar processo" → **Esperado:** sem mudança. *Confirmado em 2026-11-01 (ver o critério de aceite correspondente).*

## 9. Perguntas em Aberto
- Os 5 s para a frase de apoio e o texto dela estão bem? (valor inicial, ajustável depois do teste).
- Ao implementar, conferir um possível comportamento antigo de `handleAtualizarDatajud`: ele decide `if (processoEmPrevia) abrirPrevia(data)` com o valor de quando o botão foi clicado, então fechar a prévia no meio da consulta talvez reabra a janela quando a resposta chegar. Se confirmar, é falha que já existe e **não** entra nesta spec (virar issue), a não ser que atrapalhe o teste.
  - **Confirmado em 2026-11-01:** fechar a prévia no meio da consulta e esperar a resposta reabre a janela. O mesmo acontece no processo completo: clicar em "Atualizar processo" e voltar para "Meus processos" faz a janela do processo reabrir sozinha. Não atrapalhou o teste (sem erro no console, botão volta a funcionar), então **fica fora desta spec** e vira issue.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
