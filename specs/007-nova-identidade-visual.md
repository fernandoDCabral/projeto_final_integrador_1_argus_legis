# Spec 007: Nova identidade visual e calendário de prazos
**Status:** Implementada   **Data:** 2026-10-18
**Relacionadas:** issue #76 (Sprint 4) · protótipo aprovado: https://claude.ai/artifact/FButaMoQvotkxz5eJ8Z8Gs (privado, conta do Sávio)

## 1. Contexto
- **Como funciona hoje:** todo o visual está em estilos inline no objeto `styles` de `frontend/src/pages/Dashboard.tsx` (~1.700 linhas) e nos estilos de `Login.tsx`, `CadastroEscritorio.tsx`, `EsqueciSenha.tsx` e `RedefinirSenha.tsx`. Identidade atual: azul-marinho `#1a2a3a`, dourado `#D4AF37`, `fontFamily: "sans-serif"`, logo `frontend/public/logo.jpg`. Não há router: a troca de tela é por estado (`abaAdvogado`, `abaAdmin`).
- **Problema observado:** issue #76 (Victor): *"É preciso realizar mudanças de visual do frontend. Ex. Calendário"*. Nos prints de 18/10: emojis como ícones; cartão "Bem-vindo / Perfil ativo" no topo de toda tela sem informação útil; "Argus Legis" repetido (logo + título); cabeçalho "Painel Operacional — Gerenciamento" igual em todas as telas; botão "Sair" vermelho e chamativo; tabelas com cabeçalho quebrando linha, CNJ sem pontuação, botão "Peças" com ícone quebrado e coluna "Ações" quase vazia; fonte do sistema com negrito pesado.

## 2. Objetivo
- **O que fazer:** aplicar no frontend inteiro a identidade nova aprovada no protótipo (layout com menu lateral escuro, cores petróleo/areia/cobre, títulos em serifa, sem emojis) e criar o **calendário de prazos** do advogado, mais os extras aprovados.
- **Por que fazer:** o sistema precisa ter cara de escritório de advocacia de renome — simples e bem feito — e o advogado precisa ver primeiro "o que vence quando".

## 3. Decisões
- **Decidido:** escopo = **calendário de prazos + visual novo no projeto inteiro** — **porque** o Sávio apontou telas mal posicionadas e feias em todo o sistema, não só a falta do calendário.
- **Decidido:** **identidade nova**, com o **layout da proposta A** (menu lateral escuro) e as **cores da proposta C** (petróleo, areia, cobre) — **porque** foi a combinação escolhida no protótipo.
- **Decidido:** fontes **EB Garamond** (títulos) e **Source Sans 3** (texto), do Google Fonts — **porque** dão o tom clássico sem ficar pesado. A Cormorant Garamond (do layout da A) foi trocada depois do teste: os acentos dela flutuavam acima das letras ("você", "Próximos").
- **Decidido:** logo = **nome "Argus Legis" em serifa + símbolo "A" num círculo cobre**, feito em HTML/CSS (sem imagem) — **porque** muda de cor com a paleta e escritórios tradicionais usam nome forte e símbolo discreto.
- **Decidido:** manter **todos os extras** do protótipo: item "Calendário" no menu; busca e ordenação em Meus processos; filtros nos Processos do ADMIN; coluna "Processos" na Equipe; linha do tempo do DataJud no processo completo; frase no login — **porque** o Sávio aprovou todos.
- **Decidido:** **só frontend** — **porque** a API já devolve prazos (`data_vencimento`, `finalizado`), responsável, cliente, `prazo_estimado` e movimentações; resumo, calendário, busca, filtros e contagens são calculados na tela.
- **Decidido:** a identidade antiga (azul-marinho + dourado + `logo.jpg`) fica registrada na memória do Claude como plano B; se o Sávio desistir, a repaginação segue com ela refinada.
- **Descartado:** manter a identidade atual refinada — **porque** o Sávio preferiu uma nova (fica como plano B).
- **Descartado:** só repaginar sem calendário, ou só calendário — **porque** o pedido é os dois.
- **Descartado:** biblioteca de componentes/CSS (Tailwind, MUI) ou de calendário — **porque** o projeto usa estilos inline e o código precisa ser simples de explicar para a banca; o calendário é uma grade de 7 colunas.
- **Descartado:** router (React Router) para as telas novas — **porque** o projeto decidiu não ter router; "Calendário" vira mais um valor de `abaAdvogado`.

## 4. Escopo
- **Arquivos a alterar/criar:** `frontend/index.html` (fontes e título), `frontend/public/favicon.svg` (novo símbolo), `frontend/src/index.css` (base: fundo, fonte), `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/CadastroEscritorio.tsx`, `frontend/src/pages/EsqueciSenha.tsx`, `frontend/src/pages/RedefinirSenha.tsx`.
- **Fora de escopo:** backend e banco (nenhuma rota, schema ou migration); regras de negócio (cálculo de prazo, permissões, piscina, peças, CEP); apagar `logo.jpg` (fica no repositório, sem uso); tema escuro.
- **Restrições (não pode quebrar):** todos os fluxos que já existem continuam funcionando igual — login, recuperação de senha, cadastro de escritório, advogado e cliente (com CEP da Spec 006), cadastro de processo com DataJud, assumir com data obrigatória, liberar, excluir, peças com avisos (Specs 003–005), regra dos 30 dias e cores de prazo da Spec 002. Mensagens de erro e sucesso continuam aparecendo.

## 5. Diretrizes Técnicas
- **Referência visual:** o protótipo (artboards da segunda e terceira fileiras). Onde a spec e o protótipo divergirem, vale a spec; onde nenhum dos dois cobrir, **pare e pergunte**.
- **Cores** (um objeto `CORES` no topo do `Dashboard.tsx`, usado pelo `styles`; as outras páginas repetem só o que usam):

  | Nome | Valor | Uso |
  |---|---|---|
  | `marca` | `#1E3D4C` | menu lateral, títulos, botão principal |
  | `marcaTexto` | `#F1ECE2` | texto sobre o menu e o botão principal |
  | `marcaSuave` | `#B7C6CD` | itens inativos do menu |
  | `fundo` | `#F3EFE7` | fundo das telas |
  | `papel` | `#FFFFFF` | cartões, tabelas, janelas |
  | `tinta` | `#17242B` | texto |
  | `suave` | `#55626A` | texto secundário |
  | `linha` | `#DDD6C9` | bordas |
  | `detalhe` | `#D49A6E` | símbolo, item ativo do menu, sublinhados |
  | `detalheTexto` | `#A35A2E` | texto em cobre sobre fundo claro |
  | vencido | fundo `#F4E1DF`, texto `#7E2424` | etiquetas de prazo vencido |
  | urgente | fundo `#F6E6CF`, texto `#7A420C` | até 3 dias e estimativas |
  | em dia | fundo `#E1EAEE`, texto `#1E3D4C` | prazo em dia |
  | neutro | fundo `#ECE8E0`, texto `#4A4F53` | finalizado / sem prazo (regra dos 30 dias) |

  Sucesso continua verde (`#2e7d32` sobre `#e8f5e9`).
- **Fontes:** `<link>` do Google Fonts no `index.html` para EB Garamond (500/600/700) e Source Sans 3 (400/500/600). Títulos (`h1`/`h2`, números do resumo, logo) em EB Garamond; resto em Source Sans 3.
- **Sem emojis** em nenhum lugar da interface. Ícones = SVG de traço fino inline (como no protótipo), com `aria-hidden="true"`.
- **Menu lateral (todas as telas logadas):** símbolo + "Argus Legis" no topo; itens com ícone; item ativo com fundo levemente claro e barra cobre à esquerda; embaixo, nome do usuário, perfil (e OAB do advogado) e botão "Sair" discreto (contorno, sem vermelho). Advogado: Painel · Calendário · Meus processos · Piscina. ADMIN: Equipe · Clientes · Processos. Saem o cartão "Bem-vindo / Perfil ativo" e o cabeçalho "Painel Operacional — Gerenciamento"; cada tela tem seu próprio título (`h1`) e subtítulo.
- **Painel do advogado:** título "Painel" + data de hoje por extenso; **resumo** em 4 números (prazos vencidos, vencem em até 3 dias, prazos no mês, processos na piscina); **calendário do mês** (grade 7 colunas, domingo a sábado, dias de fora do mês apagados, hoje marcado, cada prazo em aberto no seu dia de vencimento com a cor da situação, setas mês anterior/próximo); ao lado, **próximos prazos** (os 4 mais próximos, com data, título, CNJ e situação) e **na piscina** (processos sem responsável com o prazo estimado e "Ver prévia e assumir", que abre a prévia que já existe).
- **Situação do prazo** (mesmo critério de hoje; Spec 002): vencido = `data_vencimento` antes de hoje e não finalizado; urgente = vence de hoje até 3 dias corridos; em dia = o resto. Prazos finalizados não aparecem no calendário nem no resumo.
- **Calendário (item do menu):** a mesma grade do Painel, ocupando a tela toda, com navegação entre meses. Sem nova regra.
- **Meus processos:** tabela Processo (CNJ pontuado + título) · Cliente · Tribunal · Prazo (etiqueta) · "Abrir"; **busca** por CNJ, título ou nome do cliente (filtra na tela, sem diferenciar maiúscula e acento); **ordenação** "Por vencimento" (padrão: vencidos primeiro, depois o mais próximo; sem prazo no fim) ou "Mais recentes" (cadastro mais novo primeiro).
- **Processo completo:** trilha "Meus processos / CNJ" para voltar; título + CNJ · tribunal · grau; botões "Liberar para a piscina" (secundário) e "Atualizar do DataJud"; **faixa** com o prazo em aberto mais próximo e a data da publicação; cartões Dados do processo, Cliente (com o endereço da Spec 006), Prazos, Peças (com os avisos da Spec 004 e a linha "Enviada em … por …" da Spec 005); **Movimentações** do DataJud em linha do tempo (as mesmas que já aparecem hoje).
- **Prévia da piscina:** a janela que já existe, no visual novo (cabeçalho com título e CNJ, botão fechar com `aria-label`, dados em 2 colunas, caixa de estimativa, peças, data da publicação obrigatória, rodapé com "Fechar" e "Assumir processo").
- **Equipe (ADMIN):** tabela Nome (com as iniciais em círculo) · E-mail · OAB · **Processos** (quantos o advogado é responsável, contados na lista de processos que o ADMIN já carrega).
- **Clientes (ADMIN):** tabela Cliente (nome + documento) · Contato (telefone + cidade/UF) · Processos · Excluir; o cadastro de cliente (com CEP) no visual do protótipo — pode continuar como janela ou ficar ao lado da lista, o que for mais simples no código atual.
- **Processos (ADMIN):** tabela Processo · Cliente · Tribunal · Responsável (ou etiqueta "Na piscina") · Prazo · Peças/Excluir; **filtros** Todos · Na piscina · Com prazo vencendo (vencido ou urgente).
- **Login:** tela dividida — à esquerda, fundo petróleo com o símbolo, "Argus Legis", a frase *"Onde você estiver, o caso está com você."* (trocada pelo Sávio depois do teste; a do protótipo era "Os prazos do escritório, sempre à vista.") e "Gestão de prazos processuais · Fortaleza/CE"; à direita, o formulário. `CadastroEscritorio`, `EsqueciSenha` e `RedefinirSenha` seguem o mesmo padrão (mesma tela dividida ou o mesmo cartão de formulário).
- **CNJ pontuado** em todas as telas: `NNNNNNN-DD.AAAA.J.TR.OOOO` (uma função de formatação em `utils/formatos.ts`, como as outras).
- **Acessibilidade e tamanho:** botões e links de ação com no mínimo 44 px de altura; `label` em todo campo; contraste de texto ≥ 4,5:1 (as cores da tabela já passam); botão só com ícone leva `aria-label`.
- **Celular:** o menu lateral vai para cima em telas estreitas; tabelas e o calendário rolam de lado dentro do cartão.
- **Código:** seguir o padrão do arquivo (funções `render*` no próprio `Dashboard.tsx`, estilos no objeto `styles`); sem componente em arquivo novo, sem biblioteca nova. Pode criar funções pequenas de cálculo (situação do prazo, dias do mês) no mesmo arquivo.

## 6. Etapas de Implementação
Tudo com o Arquiteto, em **duas rodadas** (para caber no contexto do agente). Build dentro do container ao fim de cada etapa.

Rodada 1
1. Base: fontes no `index.html`, `favicon.svg` novo, `index.css`, objeto `CORES`, `styles` reescrito, menu lateral novo, saem o cartão "Bem-vindo" e o cabeçalho fixo, sem emojis. → build passa; as telas abrem.
2. Painel do advogado: resumo, calendário com navegação, próximos prazos e piscina. → build passa.
3. Item "Calendário" no menu (`abaAdvogado = "calendario"`). → build passa.
4. Meus processos com busca e ordenação; CNJ pontuado (`formatarCnj`). → build passa.

Rodada 2
5. Processo completo (trilha, faixa de prazo, cartões, linha do tempo) e prévia da piscina. → build passa.
6. Telas do ADMIN: Equipe (coluna Processos), Clientes (tabela + cadastro), Processos (filtros). → build passa.
7. Login, CadastroEscritorio, EsqueciSenha e RedefinirSenha. → build passa.
8. Varredura: nenhum emoji sobrando (`grep` por caracteres de emoji), nenhum `#1a2a3a`/`#D4AF37` sobrando, `logo.jpg` sem uso. → saída do grep.

Rodada 3 (ajustes visuais achados no teste de 18/10, aprovados pelo Sávio)
9. Botões sem caixa alta em CadastroEscritorio, EsqueciSenha e RedefinirSenha ("Enviar link", "Criar conta").
10. Mensagem de aviso do topo (ex.: "Cliente removido.") some ao trocar de aba do menu.
11. Tabelas: células alinhadas pelo topo (botões e texto na mesma linha de cima).
12. Calendário (Painel e aba): botão "Hoje" ao lado das setas, que volta ao mês atual.
13. Celular (< 700 px): menu compacto numa faixa só (marca + itens em linha, rolando de lado se preciso), para o conteúdo ganhar a largura.
14. Select "Tipo de pessoa" com a mesma altura dos outros campos (44 px).
15. Peças: o campo de arquivo nativo vira um botão "Escolher PDF" (input escondido ligado a um `label`), mostrando o nome do arquivo escolhido.
16. Tabela de Clientes: e-mail de volta na coluna Contato, abaixo do telefone (cidade/UF continua).
→ build passa ao fim; o Testador confere só estes 8 itens.

## 7. Critérios de Aceite
- [x] Dado qualquer tela logada, quando abre, então tem o menu lateral petróleo com o símbolo "A" cobre e "Argus Legis" em serifa, o título próprio da tela, e não tem o cartão "Bem-vindo" nem emojis.
- [x] Dado o advogado com prazos em aberto, quando abre o Painel, então o resumo mostra os números certos (vencidos, até 3 dias, no mês, na piscina) e cada prazo aparece no seu dia do calendário com a cor da situação.
- [x] Dado o Painel em outubro, quando clica na seta para o próximo mês, então mostra novembro com os prazos de novembro; e volta para outubro na seta anterior.
- [x] Dado um prazo finalizado, quando abre o Painel ou o Calendário, então ele não aparece.
- [x] Dado o menu do advogado, quando clica em "Calendário", então abre a grade do mês em tela cheia.
- [x] Dado Meus processos, quando digita parte do CNJ, do título ou do nome do cliente na busca, então só aparecem os processos que batem; e "Por vencimento" põe o vencido primeiro.
- [x] Dado o processo completo, quando abre, então mostra a trilha de volta, a faixa com o prazo mais próximo, os cartões, as peças com os avisos das Specs 004/005 e as movimentações em linha do tempo.
- [x] Dado a prévia da piscina, quando tenta assumir sem data, então continua bloqueando (Spec de 15/10); com a data, assume e cria o prazo.
- [x] Dado o ADMIN, quando abre Equipe, então cada advogado mostra quantos processos tem; em Processos, os filtros "Na piscina" e "Com prazo vencendo" filtram certo.
- [x] Dado o cadastro de cliente, quando digita o CEP 60160-230, então continua preenchendo sozinho (Spec 006).
- [x] Dado a tela de login, quando abre, então aparece dividida com a marca à esquerda; login, "Esqueci a senha" e "Criar conta" continuam funcionando.
- [x] Dado todos os CNJs na interface, então aparecem pontuados (`3003705-20.2025.8.06.0071`).

*Evidência (18/10): Testador 14/14 ok em 1440 e 390 px (nota "Teste Spec 007" do Maestri); rodada 3 com 8 ajustes conferida (R1–R8); R5 (celular) refeito e conferido pelo Maestro em 390 px.*
- [x] Dado a tela com 390 px de largura, quando abre o Painel, então o menu fica em cima, nada sai da tela e o calendário rola de lado.

## 8. Testes e Validação
### Automatizados
- O projeto não tem testes automatizados de frontend. Só o build:
- [x] `docker compose exec frontend npm run build` passa sem erro ao fim de cada rodada. *(rodadas 1, 2, 3 e correção do R5: "✓ built", sem erro)*
### Manual
Arquiteto (ao fim da rodada 2):
- [x] **Ação:** `grep` por emojis e pelas cores antigas em `frontend/src` → **Esperado:** nada. *(grep de emojis, `#1a2a3a`, `#D4AF37` e `logo.jpg`: saída vazia)*

Tela (Testador, no portal, com a nota "Conta de teste"; nota "Teste Spec 007" com os critérios da seção 7):
- [x] **Ação:** percorrer cada tela do advogado e do ADMIN e o login → **Esperado:** visual do protótipo, sem emojis.
- [x] **Ação:** conferir resumo e calendário contra os prazos do banco (só SELECT) → **Esperado:** números e dias batem.
- [x] **Ação:** busca, ordenação e filtros → **Esperado:** filtram certo.
- [x] **Ação:** fluxos que já existiam: login/sair, assumir com data, liberar, enviar/apagar peça, cadastrar cliente com CEP → **Esperado:** funcionam igual.
- [x] **Ação:** tela com 390 px (`maestri portal resize`) → **Esperado:** menu em cima, nada cortado.
- [x] **Ação:** no fim, apagar dados de teste criados → **Esperado:** banco como antes.

### Desvios da spec
- `main.tsx` passou a importar o `index.css` (antes não era importado em lugar nenhum).
- OAB no menu só aparece se o login devolver `oab` (hoje não devolve; mostrar exige 1 linha no backend — fora desta spec).
- Sem botão "Novo processo" no Painel do advogado (advogado não cadastra processo).
- Tela "Piscina" do menu: lista simples dos processos da piscina (o protótipo só tinha o título).
- Faixa do processo completo sem "15 dias úteis (CPC)" (a API não devolve essa informação).
- Cadastro de cliente continua em janela; "Tipo de pessoa" continua select.
- Textos do login seguem o protótipo ("Entrar", "Esqueci a senha"); botão da prévia passou de "Assumir Caso" para "Assumir processo".
- Rodada 3 (etapas 9–16) acrescentada depois do teste, com os ajustes visuais aprovados pelo Sávio.
- Fonte dos títulos trocada de Cormorant Garamond para EB Garamond depois do teste (acentos flutuando na Cormorant).
- Fica como está: data vazia da prévia mostra o exemplo do navegador.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
