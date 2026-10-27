# Spec 010: Data de publicação pelo DJEN
**Status:** Aprovada   **Data:** 2026-10-25
**Relacionadas:** Issue #94 · Spec 001 (detectar processo encerrado), Spec 002 (revisão da contagem de prazos), Spec 011 (DataJud: resposta parcial e timeout)

## 1. Contexto
- **Como funciona hoje:**
  - `consultar_processo` (`app/service/datajud_service.py`) procura nas movimentações do DataJud o movimento **1061** (disponibilização no DJe) e usa o dia útil seguinte como `data_publicacao`. Se não achar, usa o movimento **92** (Publicação).
  - Essa data é guardada em `processos.data_publicacao_datajud` no cadastro (`POST /processos/`, que recebe o que a tela trouxe do `GET /datajud/{cnj}`) e no botão "Atualizar DataJud" (`POST /processos/{id}/datajud`, `app/routes/processos.py:221`). A partir dela é calculado o `prazo_estimado`.
  - Na tela (`frontend/src/pages/Dashboard.tsx`), a data é só sugestão: ao assumir, o advogado confere no DJEN e confirma (textos nas linhas 1545, 1579, 1586-1587 e 1604-1606).
- **Problema observado:** o DataJud recebe os dados dos tribunais com atraso. No processo `3003705-20.2025.8.06.0071` (TJCE), o DJEN tinha uma intimação disponibilizada em **09/10/2026** que o DataJud ainda não mostrava. O prazo estimado foi calculado a partir de uma publicação velha.
- **O que já testamos na API do DJEN** (`GET https://comunicaapi.pje.jus.br/api/v1/comunicacao`):
  - é pública, não precisa de chave;
  - `?numeroProcesso=<20 dígitos>` devolve `{status, message, count, items}`. Nesse processo foram 12 comunicações;
  - cada item tem `data_disponibilizacao` (AAAA-MM-DD), `tipoDocumento` ("Intimação", "Intimação de pauta", "INTIMAÇÃO DA SENTENÇA", "Notificação", "Distribuição"...), `link` (documento no PJe), `ativo` (false = cancelada) e `texto` (até ~30 mil caracteres, com nomes das partes);
  - comunicações vêm repetidas (uma por parte intimada);
  - limite: 20 chamadas seguidas; a 21ª dá **429** com `Retry-After: 4`, e uns 10 s depois libera de novo;
  - cobre também a Justiça do Trabalho (TRT7);
  - cada item tem também um `hash`. Com ele, `GET /api/v1/comunicacao/{hash}/certidao` devolve a **certidão de publicação** em PDF, pública e sem chave (testado em 25/10/2026: PDF de 91 KB). É o comprovante oficial de quando a comunicação foi publicada;
  - não achamos documentação oficial publicada, então a API pode mudar sem aviso. Na noite de 26/10/2026 ela ficou um tempo respondendo **504** em tudo, tanto na consulta quanto na certidão.
- **O que o DJEN não cobre:** pelo art. 13 da Resolução CNJ 455/2022, o DJEN publica despachos, decisões, dispositivo de sentença, ementa de acórdão e intimações aos advogados **quando não é exigida vista ou intimação pessoal**. Intimação pessoal e vista dos autos (Ministério Público, Defensoria, parte sem advogado) não aparecem nele. Por isso a data continua sendo algo que o advogado confere.
- **Fontes externas usadas:** o repositório `thiagozs/skills-datajud-djen-jus` e o artigo "API do DJEN" do Chat Jurídico (20/08/2026), que repete os mesmos relatos. Alguns pontos deles não se confirmaram nos nossos testes: o "máximo de 50 itens por página" (51 e 100 funcionaram), os sufixos de OAB no CE (não mudaram nada) e o "500 sob rajada" (recebemos 429).

## 2. Objetivo
- **O que fazer:** nas duas consultas que já existem (cadastro e "Atualizar DataJud"), buscar também a última publicação do processo no DJEN. Quando ela for igual ou mais recente que a do DataJud, ela passa a valer. Junto da data, guardar e mostrar a data de disponibilização, a fonte, o tipo da comunicação, o link do documento e o link da certidão.
- **Por que fazer:** o DJEN é a fonte oficial das intimações e sai antes do DataJud. A data de publicação é a base do prazo, que é o centro do Argus.

## 3. Decisões
- **Decidido:** buscar no DJEN **pelo número do processo**, só quando o DataJud já é consultado, ou seja, nos cliques em "Buscar no DataJud" e "Atualizar DataJud". Abrir ou listar processos não chama a API. **Porque** é 1 chamada por clique do advogado, o que nem chega perto do limite de 20, e não precisa de rotina agendada.
- **Decidido:** a publicação do DJEN vale quando a data dela for **igual ou mais recente** que a do DataJud. Se a do DataJud for mais recente, ou se o DJEN não trouxer nada, fica a do DataJud. **Porque** o DJEN é a fonte oficial e sai antes. No empate fica o DJEN porque ele traz tipo e link.
- **Decidido:** o DJEN só **complementa**. Se ele falhar (timeout, 429, fora do ar, resposta estranha), a consulta segue só com o DataJud, sem erro para o usuário. **Porque** a API não é documentada, e uma falha nela não pode travar o cadastro, que hoje depende do DataJud (Spec 001).
- **Decidido:** ignorar as comunicações com `tipoDocumento` "Distribuição" e as canceladas (`ativo: false`). **Porque** "Distribuição" só avisa que o processo chegou a um órgão e não abre prazo, e uma publicação cancelada não conta. Os outros tipos (Intimação, Notificação, Intimação de pauta, Intimação da sentença...) contam, e a data continua sendo **estimativa** que o advogado confere ao assumir.
- **Decidido:** renomear `processos.data_publicacao_datajud` para **`data_publicacao`**. **Porque** a data deixa de vir só do DataJud e o nome antigo ficaria enganoso.
- **Decidido:** cinco colunas novas em `processos`: `data_disponibilizacao`, `fonte_publicacao` ("DJEN" ou "DataJud"), `tipo_publicacao`, `link_publicacao` e `hash_publicacao`. **Porque** a tela vai mostrar, por exemplo, "Intimação, disponibilizada em 09/10/2026 e publicada em 13/10/2026 (fonte: DJEN) · ver documento · certidão (PDF)".
- **Decidido:** guardar a **data de disponibilização** separada da data de publicação. **Porque** é a data que aparece no diário, então o advogado confere direto. Também dá para recalcular a publicação se o calendário de feriados mudar. Vem do DJEN (`data_disponibilizacao`) ou, quando a fonte for o DataJud, do movimento **1061**. Se o DataJud só tiver o movimento **92** (Publicação), ela fica nula.
- **Decidido:** guardar só o `hash` e montar o link da certidão na tela (`https://comunicaapi.pje.jus.br/api/v1/comunicacao/{hash}/certidao`, abre em nova aba). **Não** baixar nem guardar o PDF. **Porque** o PDF fica no CNJ (sem dado pessoal no nosso banco e sem arquivo para guardar), e o backend não precisa servir de intermediário.
- **Decidido:** manter os avisos de "confira no DJEN" na tela, agora com os links. **Porque** a data continua sendo estimativa: o DJEN não traz intimação pessoal nem vista (art. 13 da Res. CNJ 455/2022) e pode estar fora do ar.
- **Decidido:** a data de publicação do DJEN é o **dia útil seguinte** à `data_disponibilizacao`, calculado com `prazo_service.proximo_dia_util`. **Porque** é a mesma regra que o projeto já usa para o movimento 1061 (Lei 11.419/2006, art. 4º, §3º; CPC art. 224, §2º).
- **Decidido:** quando a publicação vier do DJEN, o `peticao_apos_publicacao` é recalculado: fica `true` se houver movimento **85** (Petição) no DataJud com data **depois** da disponibilização do DJEN. **Porque** ele precisa se referir à publicação que está valendo. Continua sendo só um indício, já que o DataJud pode não ter as petições mais recentes.
- **Decidido:** **não guardar o `texto`** da comunicação. **Porque** traz dado pessoal das partes (LGPD) e é grande, e o link já leva ao documento.
- **Decidido:** a chamada ao DJEN fica dentro de `datajud_service.consultar_processo`. **Porque** assim o `GET /datajud/{cnj}` (cadastro) e o `POST /processos/{id}/datajud` (atualizar) recebem o resultado sem mudar o fluxo das rotas.
- **Descartado:** busca por OAB e atualização automática. **Porque** precisa de UF da OAB no usuário, rotina agendada, paginação e controle de duplicados. Fica para a etapa 2.
- **Descartado:** o DJEN vencer sempre, mesmo com data mais antiga que a do DataJud. **Porque** jogaria fora uma publicação mais nova que o DataJud já tem.
- **Descartado:** manter o nome `data_publicacao_datajud` e só adicionar a coluna de fonte. **Porque** o nome ficaria errado; preferimos pagar o custo de renomear agora.
- **Descartado:** baixar a certidão pelo backend e guardar o PDF junto das peças do processo. **Porque** é mais código, mais armazenamento e mais dado pessoal guardado, para um documento que o CNJ já serve. Pode voltar se o advogado quiser a certidão anexada ao processo.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/service/djen_service.py` (novo): `buscar_ultima_publicacao(digitos, db)`, que chama a API, filtra e devolve `{data_disponibilizacao, data_publicacao, tipo, link, hash}` ou `None`.
  - `app/service/datajud_service.py`: em `consultar_processo`, guardar a data do movimento 1061 como disponibilização; chamar o DJEN; escolher a publicação que vale; recalcular `peticao_apos_publicacao` quando for do DJEN; devolver `data_disponibilizacao`, `fonte_publicacao`, `tipo_publicacao`, `link_publicacao` e `hash_publicacao`.
  - `app/schemas/datajud.py`: os cinco campos novos no `ConsultaDatajudResponse`.
  - `app/models/processo.py`: renomear `data_publicacao_datajud` → `data_publicacao`; colunas `data_disponibilizacao` (Date), `fonte_publicacao` (String 20), `tipo_publicacao` (String 100), `link_publicacao` (String 500) e `hash_publicacao` (String 100), todas opcionais.
  - `alembic/versions/<nova>.py`: migration que renomeia a coluna (`op.alter_column(..., new_column_name=...)`, sem perder dado), cria as cinco colunas e preenche `fonte_publicacao = 'DataJud'` onde já existe data. Nos processos antigos, `data_disponibilizacao` fica nula até o próximo "Atualizar DataJud". O downgrade desfaz tudo.
  - `app/schemas/processo.py`: renomear o campo e adicionar os cinco novos no `ProcessoBase`.
  - `app/routes/processos.py`: trocar `data_publicacao_datajud` por `data_publicacao` (linhas 61, 63, 185, 188 e 250); no "Atualizar DataJud", gravar também os cinco campos novos.
  - `frontend/src/types/datajud.ts`: os cinco campos novos.
  - `frontend/src/pages/Dashboard.tsx`:
    - trocar `data_publicacao_datajud` por `data_publicacao` (linhas 272, 572, 665, 1545 e 1604);
    - enviar os campos novos no cadastro;
    - onde hoje aparece "encontrada no DataJud", mostrar tipo, disponibilização, publicação, fonte, "ver documento" e "certidão (PDF)", com os links em nova aba;
    - ajustar os textos de "confira no DJEN" para apontar para os links quando houver.
- **Fora de escopo:**
  - Busca por OAB, campo de UF da OAB e rotina agendada (etapa 2).
  - Guardar ou exibir o `texto` da comunicação.
  - Sugerir o tipo de prazo pelo `tipoDocumento`.
  - Mudar a regra de contagem de prazo (`prazo_service`) ou o fluxo de assumir processo: o advogado continua confirmando a data.
  - Mostrar a lista de comunicações do DJEN na tela (só a última que vale).
  - Tabela `prazos` (já tem `data_publicacao` própria; não muda).
- **Restrições (não pode quebrar):**
  - O formato do `GET /datajud/{cnj}` só ganha campos novos; os atuais continuam iguais.
  - As mensagens de erro atuais do DataJud (422, 404 e 502) continuam iguais. Uma falha no DJEN nunca vira erro.
  - O cadastro continua exigindo que o DataJud encontre o processo (Spec 001).
  - Processos já cadastrados mantêm a data de publicação depois da migration.
  - Isolamento entre escritórios (`verificar_acesso_ao_processo`).
  - Migrations pelo Alembic (nada de `create_all`).

## 5. Diretrizes Técnicas
- Seguir o estilo do `datajud_service.py`: `urllib`, constantes no topo, código direto, sem classe nem abstração extra.
- Constantes: `URL_DJEN = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"`, `TIMEOUT_SEGUNDOS = 10`, `TIPOS_IGNORADOS = ("distribuição",)` (comparar em minúsculas, porque a API mistura maiúsculas e minúsculas).
- O link da certidão é montado no front a partir do `hash`. A URL base fica numa constante no `Dashboard.tsx`, para trocar num lugar só se o CNJ mudar.
- 429: esperar o `Retry-After` (no máximo 5 s) e tentar **uma** vez mais. Se falhar de novo, devolver `None`.
- Qualquer erro (HTTP, timeout, JSON inválido, campo faltando) → `logger.warning(...)` e devolver `None`.
- Escolher a comunicação de `data_disponibilizacao` mais recente entre as que sobraram do filtro. Repetidas não atrapalham, porque só uma é usada.
- Comparar pela **data de publicação** (já ajustada para dia útil) das duas fontes.
- Quando a publicação que vale vier do DataJud: `fonte_publicacao = "DataJud"`, `data_disponibilizacao` = data do movimento 1061 (ou `None` se veio do 92), e `tipo_publicacao`, `link_publicacao` e `hash_publicacao` = `None`.
- Sem nenhuma publicação nas duas fontes: todos os campos de publicação ficam `None` (como hoje).
- Sem `hash`, a tela não mostra o link da certidão. Sem `link`, não mostra "ver documento".
- **Casos de borda:**
  - DJEN fora do ar, timeout ou 429 duas vezes → segue com o DataJud, e o log registra o aviso.
  - DJEN com `count: 0` → segue com o DataJud.
  - Só comunicações canceladas ou de "Distribuição" → segue com o DataJud.
  - DJEN e DataJud com a mesma data → fica o DJEN (com tipo e link).
  - DataJud mais recente que o DJEN → fica o DataJud.
  - DataJud sem publicação nenhuma e DJEN com publicação → fica o DJEN.
  - Processo encerrado (Spec 001) → guarda a publicação normalmente, mas não calcula `prazo_estimado` (regra atual).
  - Disponibilização numa sexta antes de feriado → a publicação vai para o próximo dia útil, usando os feriados do banco.
  - Processo em segredo de justiça → o DJEN não traz nada, e segue com o DataJud.
  - Intimação pessoal ou vista (não passa pelo DJEN) → o sistema mostra a última publicação que achou. O aviso de "confira" continua na tela.
  - DJEN fora do ar quando o advogado clica no link da certidão → o CNJ mostra o erro na aba nova, e o Argus não é afetado.

## 6. Etapas de Implementação
1. Migration (renomear e criar as cinco colunas) + model. → `alembic upgrade head` roda; no Postgres, `processos.data_publicacao` existe com os dados antigos e `fonte_publicacao = 'DataJud'` onde havia data; `alembic downgrade -1` volta ao estado anterior.
2. Trocar `data_publicacao_datajud` por `data_publicacao` no schema, nas rotas e no `Dashboard.tsx`, sem o DJEN ainda. → O sistema funciona igual a antes (cadastro, atualizar, assumir).
3. Criar `djen_service.buscar_ultima_publicacao`. → Chamada isolada no shell do container para `30037052020258060071` devolve a disponibilização de 2026-10-09, a publicação de 2026-10-13 e o `hash`.
4. Ligar o DJEN em `consultar_processo` (disponibilização do 1061, escolha da fonte, `peticao_apos_publicacao` e os campos novos no schema). → `GET /datajud/30037052020258060071` no `/docs` devolve os cinco campos novos preenchidos com `fonte_publicacao: "DJEN"`.
5. Gravar os campos novos no cadastro e no "Atualizar DataJud". → Depois do clique, os campos aparecem no `GET /processos/{id}`.
6. Front: tipos, envio no cadastro, exibição de tipo, datas, fonte e links (documento e certidão), e textos de "confira no DJEN". → Conferido no navegador.

## 7. Critérios de Aceite
- [x] Dado o processo `3003705-20.2025.8.06.0071`, quando consulto `GET /datajud/{cnj}`, então `data_disponibilizacao = 2026-10-09`, `data_publicacao = 2026-10-13`, `fonte_publicacao = "DJEN"`, `tipo_publicacao = "Intimação"`, `link_publicacao` aponta para `pje.tjce.jus.br` e `hash_publicacao` vem preenchido. A disponibilização foi numa sexta e 12/10 é feriado nacional, então a publicação cai em 13/10.
- [x] Dado esse mesmo processo já cadastrado com uma publicação antiga, quando clico em "Atualizar DataJud", então `data_publicacao` passa a 2026-10-13 e o `prazo_estimado` é recalculado a partir dela pelo `prazo_service`.
- [x] Dado que o DJEN está inacessível (por exemplo, `URL_DJEN` trocada para um endereço inválido), quando consulto um processo, então a resposta vem igual à de hoje, com `fonte_publicacao = "DataJud"`, sem erro para o usuário e com um aviso no log.
- [x] Dado um processo cuja comunicação mais recente no DJEN é uma "Distribuição", quando consulto, então a data usada é a da comunicação anterior que não seja "Distribuição" (ou a do DataJud, se for mais recente).
- [x] Dado um processo em que a publicação do DataJud (movimento 1061) é mais recente que a do DJEN, quando consulto, então `fonte_publicacao = "DataJud"`, `data_disponibilizacao` é a data do 1061, e `tipo_publicacao`, `link_publicacao` e `hash_publicacao` vêm nulos.
- [x] Dado um processo cadastrado antes da migration com `data_publicacao_datajud = 2026-05-13`, quando rodo `alembic upgrade head`, então ele fica com `data_publicacao = 2026-05-13`, `fonte_publicacao = "DataJud"` e `data_disponibilizacao` nula.
- [x] Dado um processo com publicação do DJEN, quando abro a prévia para assumir, então aparecem o tipo, "disponibilizada em 09/10/2026", "publicada em 13/10/2026", "(fonte: DJEN)" e os links "ver documento" e "certidão (PDF)", os dois em nova aba, e o campo de data já vem preenchido com 13/10/2026.
- [x] Dado esse processo, quando clico em "certidão (PDF)", então abre `https://comunicaapi.pje.jus.br/api/v1/comunicacao/<hash>/certidao`, e o Argus não baixa nem guarda o PDF.
- [x] Dado qualquer processo, quando consulto, então o `texto` da comunicação não é gravado no banco.

## 8. Testes e Validação
### Automatizados
- O projeto ainda **não tem pasta de testes automatizados**. A validação é manual, abaixo.
### Manual
- [x] **Ação:** `alembic upgrade head`, depois `alembic downgrade -1` e `upgrade head` de novo → **Esperado:** sobe e desce sem erro, sem perder a data dos processos existentes.
- [x] **Ação:** no `/docs`, `GET /datajud/3003705-20.2025.8.06.0071` → **Esperado:** `data_publicacao: 2026-10-13`, `fonte_publicacao: "DJEN"`, tipo e link preenchidos.
- [x] **Ação:** cadastrar esse processo pela tela → **Esperado:** cadastro normal; na prévia aparecem "Intimação, disponibilizada em 09/10/2026 e publicada em 13/10/2026 (fonte: DJEN) · ver documento · certidão (PDF)". "Ver documento" abre o PJe do TJCE, e "certidão" abre o PDF do CNJ.
- [x] **Ação:** trocar temporariamente `URL_DJEN` por um endereço inválido, reiniciar o backend e consultar o mesmo processo → **Esperado:** consulta funciona só com o DataJud, `fonte_publicacao: "DataJud"`, e o log mostra o aviso do DJEN. Depois voltar a URL.
- [x] **Ação:** consultar um processo trabalhista do TRT7 → **Esperado:** publicação vinda do DJEN, com tipo "Notificação" ou "Intimação" (não "Distribuição").
- [x] **Ação:** clicar em "Atualizar DataJud" num processo já cadastrado → **Esperado:** data, fonte, tipo, link e `prazo_estimado` atualizados na tela.
- [x] **Ação:** conferir no Postgres a tabela `processos` → **Esperado:** nenhuma coluna com o texto da intimação.

## 9. Perguntas em Aberto
- Nesta spec o DJEN só é chamado nos botões "Buscar no DataJud" (cadastro) e "Atualizar DataJud". Abrir ou listar processos não consulta nada, então a data fica parada até alguém clicar. Ideia para depois: consultar o DJEN automaticamente ao abrir a prévia de **assumir** o processo, que é quando o advogado confirma a data e o prazo nasce. Seria 1 chamada a mais só nessa hora. Ainda não foi decidido.
- ~~Conteúdo da certidão~~ **Resolvido em 26/10/2026:** a certidão do processo de teste ("Certidão de publicação 464", 5 páginas) traz tribunal, órgão, tipo, "Disponibilizado em: 09/10/2026", destinatários, advogados com OAB, o teor completo, a regra "considera-se como data da publicação o primeiro dia útil seguinte ao da disponibilização" (Lei 11.419, art. 4º, §3º; CPC 224), o "Código da certidão" (que é o próprio `hash`) e um QR code. O nome "certidão (PDF)" serve. Como ela traz o teor e os nomes das partes, só linkar (sem guardar) continua sendo a decisão certa.
- Para a etapa 2: UF da OAB no cadastro do usuário, frequência da rotina agendada e o que fazer quando várias instâncias do Argus dividirem o mesmo IP (o limite parece ser por IP).

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
