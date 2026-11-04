# Spec 017: Sino de alertas de prazo
**Status:** Aprovada   **Data:** 2026-11-04
**Relacionadas:** Spec 007 (nova identidade visual e calendário) · Spec 013 (Atualizar todos pelo DJEN, prazo "A conferir") · Spec 016 (marcar prazo como cumprido) · issue #85 (notificação por e-mail, outro canal, fora desta spec)

## 1. Contexto
- **Como funciona hoje:**
  - O aviso de prazo é **passivo**: cores e etiquetas (vencido, urgente, "★ Nova publicação") no Painel, no Calendário e na tabela de Meus processos. O advogado só vê se abrir essas telas.
  - O Painel só aparece na aba "Painel"; nas outras abas (Calendário, Meus processos, Piscina) e dentro de um processo aberto não há nada que diga "você tem prazo vencendo".
  - `prazosAbertos` (`Dashboard.tsx`) já reúne os prazos em aberto dos processos assumidos e não encerrados; `analisarPrazo` classifica em vencido, urgente (até 3 dias) e em dia; `temPrazoAConferir` detecta a publicação nova da Spec 013.
  - Desde a Spec 016 o advogado consegue marcar o prazo como cumprido, então "vencido" deixou de ser ruído permanente: some quando ele resolve.
- **Problema observado:** o advogado entra no sistema, vai direto para um processo ou para a Piscina e não vê que há prazo vencido ou publicação nova para conferir em outro processo. Prazo perdido é o pior erro do escritório, e o sistema só mostra se a pessoa for procurar.

## 2. Objetivo
- **O que fazer:** um **sino** fixo no menu do advogado, visível em todas as abas, com um selo com o número de processos que pedem atenção. Ao clicar abre um painel que lista esses processos, agrupados em "Vencidos", "Vencem em até 3 dias" e "Para conferir", e leva ao processo completo.
- **Por que fazer:** o advogado vê de qualquer tela o que precisa de ação e chega ao processo em um clique, sem caçar no Painel.

## 3. Decisões
- **Decidido (2026-11-03/04, Victor):**
  - **Canal:** sino dentro do app. E-mail (issue #85) e Google Agenda/`.ics` ficam para depois do deploy e não fazem parte desta entrega. **Porque** o sino não depende de infraestrutura nova (SMTP, agendador, domínio).
  - **Quem vê:** só o **ADVOGADO**; o ADMIN não vê o sino. **Porque** prazo é do advogado responsável; o ADMIN não tem tela de prazos.
  - **Quais processos:** só os **assumidos** pelo advogado (`meusProcessos`) e não encerrados. A piscina fica fora. **Porque** processo da piscina não é responsabilidade de ninguém ainda, e o encerrado já é ignorado por `prazosAbertos`.
  - **"Para conferir"** (prazo com `situacao = "A conferir"`, Spec 013) entra como **grupo próprio** no painel.
  - **Selo:** conta **processos distintos** com algum alerta (vencido, urgente ou a conferir), não prazos somados. **Porque** o advogado pensa em processos, e dois prazos no mesmo processo viram uma ida só.
  - **Sem "lida/não lida":** o sino é **derivado** dos dados (`meusProcessos`); some quando o prazo é cumprido, confirmado, descartado ou o processo é liberado/encerrado. **Porque** não exige tabela nova, migration nem endpoint, e um alerta que o advogado "dispensou" sem resolver o prazo é exatamente o risco que o sino quer evitar.
  - **Uma linha por processo** no painel, **mantida** (2026-11-04). A regra fica isolada numa função (`alertasDoAdvogado`) para poder trocar a política depois (por exemplo, o "vencido há muito tempo vira cinza"). Consequência: o grupo "Para conferir" lista só os processos cujo **único** alerta é a conferência; quem também tem prazo vencido ou urgente fica no grupo mais grave, com a etiqueta do "A conferir" junto.
  - **Contagem com a palavra na linha** (2026-11-04): cada linha mostra quantos prazos de cada tipo o processo tem, sempre com a palavra junto do número ("2 vencidos", "1 urgente", "1 a conferir"). **Porque** o número sozinho não distingue o que está sendo contado, e a palavra separa o vencido do a conferir. Isso **substitui** as decisões anteriores do mesmo dia sobre o texto do "A conferir" ("★ Nova publicação: confira o prazo" com um prazo, "★ N publicações para conferir" com vários) e sobre o "+N prazos": a contagem cobre os três casos. A etiqueta "★ ..." continua só no Painel.
  ```
  ==== Vencidos (2) ====
  Processo 1 · 1 vencido                  [Vencido há 12 dias]
  Processo 2 · 2 vencidos · 1 a conferir  [Vencido há 5 dias]
  ==== Vencem em até 3 dias (1) ====
  Processo 4 · 1 urgente                  [Vence amanhã]
  ==== A conferir (1) ====
  Processo 3 · 1 a conferir
  ```
  O número no título do grupo é a quantidade de processos.
  - **Etiqueta de situação com os dias** (2026-11-04): além da contagem, a linha traz uma **etiqueta colorida** com os dias do prazo **mais crítico** do processo, no mesmo estilo do Painel (`estiloEtiqueta` + texto de `analisarPrazo`: "Vencido há N dias", "Vence hoje", "Vence amanhã", "Vence em N dias"). **Porque** a leitura é rápida e a cor ajuda o advogado a achar o mais urgente. O texto fica **completo**, com a palavra "Vencido" na etiqueta mesmo repetindo a da contagem (confirmado em 2026-11-04). A linha do "A conferir" **não** tem etiqueta de dias, porque o vencimento dele é provisório.
  - **Posição:** o botão do sino fica no **menu lateral** (na linha da marca, ao lado do nome "Argus Legis"; no celular, na linha de cima, ao lado do "Sair"), decidido em 2026-11-04. **Porque** o menu é acessível de qualquer aba, sem mexer no `renderTopo` de cada tela.
  - **Formato: janela** (`veu` + `modalPrevia`, o mesmo padrão da janela do DJEN e da prévia), com `role="dialog"`, fechar no X, no Esc e no clique fora, decidido em 2026-11-04. **Porque** a janela se adapta melhor conforme chegam novos prazos (rola por dentro e comporta muitas linhas), não é cortada pelo menu lateral (`overflowY: auto`) e já funciona em 390 px. Ao abrir, o usuário **não troca de tela**; só troca se clicar numa linha.
  - **Vários prazos no mesmo processo:** a linha só mostra a contagem, sem listar os prazos (2026-11-04). **Porque** listar todos deixaria a janela poluída. A quantidade de prazos **não** muda o grupo, a ordem nem o selo: a ordem vem do prazo mais crítico de cada processo (`dias` crescente).
  - **Contadores do Painel ficam como estão** (2026-11-04, Victor). O Painel continua somando o "A conferir" vencido em "Prazos vencidos" e "Vencem em até 3 dias" (via `prazosAbertos`); o sino o põe só em "A conferir". **Porque** mexer no Painel dobraria o escopo de uma entrega que é só o sino. A diferença fica explicada pela contagem com a palavra na linha: o Painel conta **prazos** e o sino conta **processos**, e mostra os prazos por tipo. Alinhar o Painel fica como melhoria futura (`MELHORIAS.md`, item 28).
- **Decidido (proposta desta spec, a confirmar):**
  - **Só frontend.** Nenhuma migration, rota ou mudança de backend: `GET /processos/` já traz `prazos` com `situacao`, `finalizado` e `data_vencimento`. **Porque** tudo que o sino precisa já está em `meusProcessos`.
  - **Prazo "A conferir" não conta como vencido nem urgente**; conta só em "Para conferir". **Porque** a data dele é provisória (padrão do tipo, ainda não confirmado pelo advogado); chamá-lo de "vencido" seria um alarme sobre um número que ninguém confirmou.
  - **Cada processo aparece uma vez, no grupo mais grave** (Vencidos > Vencem em até 3 dias > Para conferir), mas a linha mostra a contagem de **todos** os tipos que valem para ele (por exemplo "1 vencido · 1 a conferir"). **Porque** o caso comum depois da Spec 016 é o prazo velho vencido com um "A conferir" nascendo ao lado; uma linha só evita contar o mesmo processo duas vezes, e as etiquetas não escondem nada.
  - **Mais de um "A conferir" no mesmo processo** é possível: `criar_prazo_a_conferir` só compara a data da publicação com a dos prazos existentes e não olha se já há um "A conferir" pendente. O processo continua com **uma linha** e conta **1** no selo; a linha diz "2 a conferir". Nenhuma data é mostrada na linha do "A conferir", porque o vencimento dele é provisório.
  - **Ordem:** grupos nessa ordem; dentro do grupo, o prazo mais atrasado/mais próximo primeiro (`dias` crescente); "Para conferir" pelo título.
  - **Ir ao processo:** clicar na linha chama `abrirProcessoCompleto(processo)` e fecha o sino (mesmo caminho do "Abrir processo" da janela do DJEN).
- **Descartado:** balão ancorado no sino (e o sino no cabeçalho de cada aba). **Porque** o menu lateral cortaria o balão (seria preciso `position: fixed` e cálculo de posição), no celular ele viraria quase uma janela, e a lista tende a crescer.
- **Descartado:** marcar alerta como "lido". **Porque** exigiria persistir por usuário (tabela + rota) e criaria um jeito de "calar" um prazo vencido sem resolvê-lo.
- **Descartado:** atualização em tempo real (WebSocket/polling). **Porque** os dados já são recarregados nas ações do advogado e o sino é recalculado a cada renderização; tempo real só se justifica junto com o aviso por e-mail.
- **Adiado (2026-11-04, Victor):** recarregar os processos ao voltar o foco para a aba (`visibilitychange`). **Porque** hoje nada muda os dados do advogado sem ele agir (não há tarefa automática no servidor), e o `carregarDados` atual troca a tela por "Carregando painel...", o que fecharia janelas e formulários abertos. O sino já se recalcula a cada renderização. A ideia fica registrada na seção 9 e no `MELHORIAS.md` (item 27) para quando o sistema evoluir.
- **Descartado:** sino para o ADMIN. **Porque** ver prazo de todo o escritório é outra funcionalidade (visão de gestão), com outras perguntas (de quem é cada alerta).
- **Descartado:** mostrar a Piscina no sino. **Porque** não é responsabilidade do advogado até ele assumir; a Piscina já tem aba e cartão no Painel.
- **Descartado:** esconder ou acinzentar o vencido há muito tempo. **Porque** depende de decisão do Sávio e o ruído já diminui à medida que os prazos antigos são marcados como cumpridos (Spec 016). Fica como ajuste da função `alertasDoAdvogado`.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `frontend/src/pages/Dashboard.tsx`: ícone do sino em `ICONES`, função `alertasDoAdvogado`, botão com selo no menu, janela do sino e estilos novos.
  - `specs/README.md`: linha da spec 017.
  - `CHANGELOG.md`: entrada em "Added".
- **Fora de escopo:**
  - Backend, migration, rota nova, notificação por e-mail e Google Agenda/`.ics`.
  - Recarregar os processos ao voltar o foco para a aba (seção 9, "Ideias para depois").
  - Sino para ADMIN e processos da Piscina.
  - Marcar alerta como lido, snooze, preferências de notificação.
  - Notificação do navegador (Web Push) e som.
  - Mudar `prazosAbertos`, `analisarPrazo`, os contadores do Painel ou o Calendário.
  - "Vencido há muito tempo vira cinza".
- **Restrições (não pode quebrar):**
  - Nenhuma regra do Painel, do Calendário e da tabela de Meus processos muda; o sino só **lê** `meusProcessos`.
  - O fluxo de cumprir, confirmar e descartar prazo (Specs 013 e 016) continua igual; o sino só reflete o resultado.
  - Menu lateral continua sem rolagem horizontal em 390 px; botão com área de toque de 44 px.
  - `aria-current` e a navegação por teclado do menu continuam funcionando.

## 5. Diretrizes Técnicas
- **Função `alertasDoAdvogado(processos)`**, perto de `prazosAbertos`, sem estado e sem chamada à API. Para cada processo da lista com `status !== "Encerrado"`:
  - `abertos` = prazos com `!finalizado` e `situacao !== "A conferir"`;
  - `vencidos` = `abertos` com `analisarPrazo(...).tipo === "vencido"`; `urgentes` = com `tipo === "urgente"`;
  - `aConferir` = quantidade de prazos com `situacao === "A conferir"` e `!finalizado` (`temPrazoAConferir` só diz se há algum);
  - sem nenhum dos três (`vencidos`, `urgentes`, `aConferir > 0`), o processo não entra;
  - `grupo` = `"vencido"` se `vencidos.length`, senão `"urgente"` se `urgentes.length`, senão `"conferir"` (uma linha por processo, sempre no grupo mais grave);
  - devolve `{ processo, grupo, vencidos, urgentes, aConferir, pior }`, onde `pior` é o prazo mais crítico (menor `dias`), usado para ordenar.
- **Selo:** `alertasDoAdvogado(meusProcessos).length`. Sem alertas, o selo não aparece (e o sino fica no tom normal do menu). Acima de 99, mostra "99+".
- **Contagem na linha:** cada linha mostra a contagem por tipo, **sempre com a palavra junto do número**, só dos tipos que existem no processo e nesta ordem: "N vencido(s)", "N urgente(s)", "N a conferir" (singular com 1: "1 vencido", "1 urgente"; "a conferir" não varia). `vencidos.length`, `urgentes.length` e `aConferir` já saem de `alertasDoAdvogado`; `aConferir` passa a ser a quantidade, não um booleano. Processo com dois tipos de alerta aparece uma vez, no grupo mais grave, com os dois: `Processo 1 · 1 vencido · 1 a conferir`. O número ao lado do título do grupo é a quantidade de **processos** do grupo (a que o selo soma). Não lista os prazos na janela. À direita da contagem, a **etiqueta de situação** do prazo mais crítico (`pior`) em `estiloEtiqueta(analisarPrazo(pior.data_vencimento).tipo)` com o texto de `analisarPrazo`; processo só com "A conferir" não tem etiqueta. No celular a etiqueta pode descer para uma segunda linha.
- **Linha:** título do processo, `formatarCnj(cnj) · tribunal` e a contagem por tipo; é um `<button>` de largura total (alvo de 44 px), não um `<a>`.
- **Acessibilidade:**
  - o botão do sino tem `aria-label` com o número: "Alertas de prazo: 3 processos" (ou "Alertas de prazo: nenhum");
  - `aria-haspopup="dialog"`; a janela tem `role="dialog"`, `aria-modal="true"` e `aria-labelledby`;
  - o selo é decorativo (`aria-hidden`), a informação vai no `aria-label`;
  - fechar com Esc e devolver o foco ao botão do sino;
  - a cor nunca é o único sinal: a contagem traz a palavra ("vencido", "urgente", "a conferir") e a etiqueta traz o texto dos dias ("Vencido há N dias").
- **Estado vazio:** a janela abre com "Nenhum prazo pedindo atenção." (o advogado pode abrir o sino e ter certeza de que está em dia).
- **Fuso e data:** usa `analisarPrazo`, que já compara com o dia local do navegador; nada novo.
- **Casos de borda:**
  - Cumprir/descartar/confirmar o último prazo do processo: o selo diminui na hora (os handlers já atualizam `meusProcessos`).
  - Assumir um processo cujo prazo já nasce vencido: entra no sino logo após o `meusProcessos` ser atualizado.
  - Liberar o processo (volta à piscina) ou ele ser encerrado: sai do sino.
  - Processo com prazo cumprido e nenhum aberto: não entra.
  - Atualizar todos pelo DJEN (Spec 013) traz "A conferir" novos: o selo sobe; processos já alertados não são contados duas vezes.
  - Aba aberta de um dia para o outro sem recarregar: o texto e o grupo se recalculam quando a tela renderiza de novo (`analisarPrazo` usa a data de hoje), mas a lista de processos só se atualiza ao recarregar ou agir (ver Perguntas em Aberto).
  - Muitos alertas: a janela rola dentro (`veu` já tem `overflowY: auto`).
  - ADMIN: o botão não é renderizado.

## 6. Etapas de Implementação
1. `alertasDoAdvogado` + ícone de sino em `ICONES`. → conferida no console ou numa tela provisória com os processos do banco local: devolve o grupo certo para um processo vencido, um urgente, um só "A conferir" e um com vencido + "A conferir".
2. Botão do sino com selo no menu (desktop e celular), só para ADVOGADO. → selo com o número esperado em todas as abas; ADMIN não vê.
3. Janela do sino com os três grupos, linhas, estado vazio, Esc/X/clique fora e devolução do foco. → abre, fecha e lista.
4. Clique na linha abre o processo completo e fecha o sino. → vai para "Meus processos" com o processo aberto.
5. Atualização reativa: cumprir, confirmar, descartar e assumir mudam o selo sem recarregar. → conferido nos fluxos das Specs 013 e 016.
6. `specs/README.md`, `CHANGELOG.md` e roteiro manual. → spec listada.

## 7. Critérios de Aceite
- [ ] Dado um advogado com 2 processos assumidos vencidos e 1 só com "A conferir", então o selo mostra **3** e a janela mostra os grupos "Vencidos" (2) e "Para conferir" (1).
- [ ] Dado um processo com um prazo vencido **e** um "A conferir", então ele aparece **uma vez**, em "Vencidos", com a linha "1 vencido · 1 a conferir", e conta **1** no selo.
- [ ] Dado um processo com dois prazos "A conferir" (duas publicações novas sem conferir), então ele aparece **uma vez** na janela, conta **1** no selo e a linha diz "2 a conferir".
- [ ] Dado um processo com um só "A conferir", então a linha diz "1 a conferir", sem data de vencimento.
- [ ] Dado um processo com 2 prazos vencidos, então a linha diz "2 vencidos"; com 1, "1 vencido". O número no título do grupo é a quantidade de **processos**, não de prazos.
- [ ] Dado um processo com 2 prazos vencidos, um há 5 e outro há 12 dias, então a etiqueta mostra "Vencido há 12 dias" (o mais crítico) e o processo fica antes, no grupo, de um cujo mais atrasado está vencido há 5 dias.
- [ ] Dado um processo cujo prazo vence amanhã, então ele está em "Vencem em até 3 dias" com "1 urgente" e a etiqueta "Vence amanhã"; dado um processo só com "A conferir", então a linha não tem etiqueta de dias.
- [ ] Dado um processo em que o único prazo aberto é um "A conferir" com data já passada, então ele aparece só em "Para conferir", nunca em "Vencidos".
- [ ] Dado um prazo que vence hoje, amanhã ou em até 3 dias, então o processo aparece em "Vencem em até 3 dias"; a partir de 4 dias, não aparece.
- [ ] Dado um prazo vencido, quando marco como cumprido na tela do processo, então o selo diminui e o processo sai da janela sem recarregar a página; ao desfazer, volta.
- [ ] Dado um "A conferir", quando confirmo ou descarto, então ele sai de "Para conferir" (e, se confirmado e vencido/urgente, passa ao grupo correspondente).
- [ ] Dado um processo da Piscina com prazo vencido, então ele **não** entra no sino. Dado um processo encerrado, também não.
- [ ] Dado um advogado sem nenhum alerta, então o selo não aparece e a janela mostra "Nenhum prazo pedindo atenção.".
- [ ] Dado um ADMIN, então não há sino no menu.
- [ ] Quando clico numa linha, então abre o processo completo daquele processo e o sino fecha.
- [ ] A janela fecha com Esc, com o X e com o clique fora, e o foco volta ao sino.
- [ ] Dado um leitor de tela, então o botão anuncia o número de processos; dado 390 px, então não há rolagem horizontal no menu nem na janela.

## 8. Testes e Validação
### Automatizados
- O projeto ainda **não tem pasta de testes automatizados**. A validação é manual, abaixo. `npm run build` (tsc) e `npm run lint` não podem piorar além do estilo já existente do arquivo.
### Manual
- [ ] **Ação:** `npm run build` no `frontend/` → **Esperado:** tsc passa; ESLint sem erro novo além de `any` no estilo do arquivo.
- [ ] **Ação:** entrar como advogado com processos assumidos (vencido, urgente, só "A conferir", vencido + "A conferir", cumprido, encerrado) e conferir o selo → **Esperado:** conta só os processos com alerta, uma vez cada; cumprido e encerrado ficam de fora.
- [ ] **Ação:** abrir o sino em cada aba (Painel, Calendário, Meus processos, Piscina) e dentro de um processo aberto → **Esperado:** o botão está sempre no menu e a janela abre igual.
- [ ] **Ação:** na janela, clicar numa linha → **Esperado:** abre o processo completo e o sino fecha.
- [ ] **Ação:** marcar um prazo vencido como cumprido, depois "Desfazer" → **Esperado:** selo diminui e volta, sem recarregar.
- [ ] **Ação:** num processo com "A conferir", confirmar, depois descartar outro → **Esperado:** sai de "Para conferir".
- [ ] **Ação:** assumir um processo da piscina cujo prazo nasce vencido → **Esperado:** o selo sobe.
- [ ] **Ação:** "Atualizar todos pelo DJEN" com uma publicação nova → **Esperado:** o selo sobe com o processo em "Para conferir".
- [ ] **Ação:** entrar como ADMIN → **Esperado:** sem sino.
- [ ] **Ação:** Esc, X, clique fora e Tab dentro da janela; depois conferir com leitor de tela ou a árvore de acessibilidade → **Esperado:** fecha nas três formas, foco volta ao sino, `aria-label` com o número.
- [ ] **Ação:** em 390 px, abrir o sino com vários alertas → **Esperado:** sem rolagem horizontal; a janela rola por dentro.

## 9. Perguntas em Aberto
Nenhuma. As dúvidas da fase de rascunho foram decididas na seção 3. O que ficou para depois ou serve de aviso está abaixo.

### Informações para o futuro
- **Vencido há muito tempo** (fora desta entrega, 2026-11-04): o Sávio quer acinzentar o prazo vencido há muito tempo (como `estimativaAntiga`, 30 dias) ou manter em vermelho até o advogado resolver? A função `alertasDoAdvogado` já é o ponto de troca. O ruído diminui à medida que os prazos antigos são marcados como cumpridos (Spec 016). Registrado também no `MELHORIAS.md`, item 29.
- **Aviso para quem sobe a versão (Sávio):** esta spec depende da #106, que já está na main (PR #115). Ele ainda precisa rodar `docker compose exec app alembic upgrade head` por causa da migration da 016 (`prazos.concluido_em`); sem isso o `GET /processos/` falha e o sino não carrega. A spec 017 em si não tem migration.

### Ideias para depois
- **Recarregar os processos ao voltar o foco para a aba** (adiado em 2026-11-04). Hoje `GET /processos/` roda só ao entrar (`useEffect` em `[user]`); depois, os dados mudam só por ações do advogado. Isso deixa o sino sem acompanhar duas coisas: (a) a virada de dia com a aba aberta, porque o selo só se recalcula quando algo renderiza a tela; (b) mudança vinda de fora da aba (outra sessão do mesmo advogado, ou, no futuro, atualização automática pelo DJEN e aviso por e-mail, issue #85).
  - **Quando fazer:** junto com a atualização automática pelo DJEN ou o aviso por e-mail, quando o sistema passar a mudar dados sem o advogado agir.
  - **Como:** ouvir `visibilitychange` e, ao a aba ficar visível, buscar `GET /processos/` de novo.
  - **Cuidados:** criar uma versão **silenciosa** do `carregarDados` (sem ligar `carregando`, que troca a tela por "Carregando painel..." e fecharia janelas e formulários abertos); atualizar também a cópia em `processoAberto`; evitar buscas repetidas (por exemplo, só se passaram mais de alguns minutos desde a última).
  - **Versão mínima, se a virada de dia incomodar antes:** só forçar uma renderização ao voltar o foco, sem buscar nada. Resolve (a), não (b).

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
