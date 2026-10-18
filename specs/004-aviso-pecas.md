# Spec 004: Avisos ao apagar e enviar peça
**Status:** Implementada   **Data:** 2026-10-18
**Relacionadas:** [Spec 003 — Peças do processo](003-pecas-do-processo.md) · issue #72

## 1. Contexto
- **Como funciona hoje:** na seção "Peças" do processo completo, o advogado responsável clica em "🗑️ Apagar" e a linha troca para os botões "Confirmar" e "Cancelar", sem nenhum texto dizendo o que vai acontecer (`renderPecas`, `Dashboard.tsx` ~linha 523). Quando o `DELETE /documentos/{id}` dá certo, `handleApagarDocumento` (~linha 231) só tira a peça da lista. Quando o envio dá certo, `handleEnviarDocumento` (~linha 190) só coloca a peça na lista. Os dois só mostram mensagem quando dá erro (`erroDocumento`, caixinha abaixo da lista, ~linha 562).
- **Problema observado:** issue #72 (Victor): *"O usuário ADVOGADO ao excluir uma peça, não recebe uma mensagem de aviso"*.

## 2. Objetivo
- **O que fazer:** deixar claro, antes de apagar, que a peça vai ser apagada para sempre; e mostrar uma mensagem de sucesso depois de apagar ("Peça apagada.") e depois de enviar ("Peça enviada.").
- **Por que fazer:** hoje o advogado confirma sem saber o que o "Confirmar" faz, e depois não tem retorno de que deu certo.

## 3. Decisões
- **Decidido:** aviso **antes e depois** de apagar — **porque** a issue não diz qual dos dois, e os dois resolvem as duas leituras com pouco código.
- **Decidido:** a confirmação continua **na própria linha da peça**, agora com o texto "Apagar esta peça? Não dá para desfazer." e os botões "Apagar" (vermelho) e "Cancelar" — **porque** é o mesmo padrão das exclusões de cliente e de processo, sem janela nova.
- **Decidido:** a mensagem de sucesso aparece **dentro da seção "Peças"**, logo abaixo da lista, no mesmo lugar do erro — **porque** é onde o advogado acabou de clicar; a seção fica no fim da tela e a faixa do topo do Painel provavelmente nem seria vista.
- **Decidido:** incluir também **"Peça enviada."** ao enviar — **porque** o Sávio pediu, e é a mesma mensagem no mesmo lugar.
- **Descartado:** janela de confirmação (modal) — **porque** é estado e modal novos só para isso, e foge do padrão das outras exclusões.
- **Descartado:** `window.confirm` — **porque** o projeto já decidiu não usar (comentário em `Dashboard.tsx` ~linha 71) e a caixa sai do visual do sistema.
- **Descartado:** mensagem na faixa do topo do Painel (`setAviso`) — **porque** fica fora da vista quando a tela está rolada até as peças, que é o mesmo problema da issue.

## 4. Escopo
- **Arquivos a alterar/criar:** `frontend/src/pages/Dashboard.tsx` (só ele).
- **Fora de escopo:**
  - backend (o `DELETE /documentos/{id}` e o `POST /processos/{id}/documentos` já funcionam; nenhuma rota, schema ou migration muda);
  - confirmação de exclusão de cliente e de processo (têm o mesmo "Confirmar" sem texto, mas não fazem parte da #72);
  - prévia da piscina e a lista "📄 Peças" do ADMIN (não têm Apagar nem Enviar).
- **Restrições (não pode quebrar):** regras de acesso da Spec 003 (só o responsável envia e apaga; ADMIN só baixa); mensagens de erro atuais de enviar, baixar, apagar e carregar.

## 5. Diretrizes Técnicas
- Um estado novo `sucessoDocumento` (string), igual ao `erroDocumento`.
- `handleApagarDocumento`: no sucesso, `setSucessoDocumento("Peça apagada.")`. `handleEnviarDocumento`: no sucesso, `setSucessoDocumento("Peça enviada.")`. Os dois limpam `sucessoDocumento` no começo, junto com o `setErroDocumento("")` que já existe.
- Sucesso e erro nunca aparecem juntos: quem mostra um limpa o outro (inclusive a validação "Escolha o tipo da peça e o arquivo PDF.").
- No `useEffect` que recarrega as peças (~linha 152), limpar `sucessoDocumento` junto com `erroDocumento`, para a mensagem não passar para outro processo.
- Caixinha verde abaixo da lista, ao lado da de erro, com estilo inline reaproveitando as cores do `avisoSucesso` (`#e8f5e9`, `#c5e3c8`, `#2e7d32`) sobre o `avisoInline`. Sem criar componente nem arquivo novo.
- Confirmação: quando `documentoParaApagar === documento.id`, mostrar o texto "Apagar esta peça? Não dá para desfazer." e trocar o "Confirmar" por "Apagar" com `styles.btnConfirmarExclusao`.
- **Casos de borda:**
  - clicar em Apagar numa segunda peça com a primeira pedindo confirmação → a confirmação passa para a segunda (já é assim: `documentoParaApagar` guarda uma só);
  - trocar de processo ou fechar → mensagem some;
  - erro ao enviar (sem tipo, arquivo grande, PDF inválido) → só o erro, sem a verde;
  - erro ao apagar → "Não foi possível apagar a peça.", como hoje, e a peça continua na lista.

## 6. Etapas de Implementação
1. Texto e botão "Apagar" vermelho na confirmação da linha da peça. → ver na tela ao clicar em "🗑️ Apagar".
2. Estado `sucessoDocumento` + caixinha verde abaixo da lista. → `npm run build` passa.
3. "Peça apagada." no `handleApagarDocumento` e "Peça enviada." no `handleEnviarDocumento`, limpando sucesso/erro nos pontos da seção 5. → ver na tela.
4. Limpar `sucessoDocumento` no `useEffect` das peças. → abrir outro processo e a mensagem não aparece.

## 7. Critérios de Aceite
- [x] Dado o advogado responsável no processo completo, quando clica em "🗑️ Apagar" numa peça, então a linha mostra "Apagar esta peça? Não dá para desfazer." com os botões "Apagar" (vermelho) e "Cancelar". *(texto e botão vermelho conferidos no portal)*
- [x] Dado a confirmação aberta, quando clica em "Cancelar", então a linha volta ao normal e a peça continua na lista. *(peça id 6 continuou no banco)*
- [x] Dado a confirmação aberta, quando clica em "Apagar", então a peça some da lista, aparece "Peça apagada." em verde abaixo da lista e o documento não existe mais no banco. *(SELECT nos processos 23–25 → 0 linhas)*
- [x] Dado o advogado responsável, quando envia um PDF válido com tipo escolhido, então a peça entra na lista e aparece "Peça enviada." em verde. *(id 6, "peca-teste.pdf · 2 páginas")*
- [x] Dado "Peça apagada." na tela, quando tenta enviar sem escolher o tipo, então só aparece "Escolha o tipo da peça e o arquivo PDF." (a verde some). *(só o erro âmbar)*
- [x] Dado "Peça apagada." ou "Peça enviada." na tela, quando abre outro processo, então nenhuma mensagem aparece nas peças do outro processo. *(#23 → #25, e reabrindo o #23)*
- [x] Dado o ADMIN em "Todos os Processos", quando clica em "📄 Peças", então a lista aparece como antes, com Baixar e sem Apagar/Enviar. *(peça id 8, só "⬇️ Baixar")*

## 8. Testes e Validação
### Automatizados
- O projeto não tem testes automatizados de frontend. Só o build:
- [x] `npm run build` em `frontend/` passa sem erro. *(18/10, dentro do container `frontend`: `tsc -b && vite build` → "✓ 74 modules transformed … ✓ built in 83ms", sem erro de tipo. No Mac o build não roda porque os `node_modules` são os do container Linux.)*
### Manual
Feito pelo Testador no portal em 18/10, todos ok (detalhes na nota "Teste Spec 004" do Maestri), com a conta de teste do "Escritorio Teste Assumir" e um processo assumido.
- [x] **Ação:** clicar em "🗑️ Apagar" e depois "Cancelar" → **Esperado:** texto da confirmação aparece; ao cancelar, peça continua.
- [x] **Ação:** "🗑️ Apagar" → "Apagar" → **Esperado:** peça some, "Peça apagada." em verde; `SELECT` no banco não acha mais o documento.
- [x] **Ação:** enviar um PDF válido → **Esperado:** peça na lista, "Peça enviada." em verde.
- [x] **Ação:** enviar sem tipo → **Esperado:** só o erro, sem a verde.
- [x] **Ação:** apagar e abrir outro processo → **Esperado:** sem mensagem no outro processo.
- [x] **Ação:** entrar como ADMIN e abrir "📄 Peças" → **Esperado:** sem mudança.

### Desvios da spec
- `handleBaixarDocumento` também limpa `sucessoDocumento` no começo — **porque** a regra "sucesso e erro nunca aparecem juntos": sem isso, um erro ao baixar logo depois de "Peça apagada." mostraria as duas caixas.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
