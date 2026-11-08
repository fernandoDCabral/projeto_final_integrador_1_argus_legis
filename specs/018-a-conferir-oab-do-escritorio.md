# Spec 018: "A conferir" pela OAB do escritório
**Status:** Implementada   **Data:** 2026-11-07
**Relacionadas:** Spec 013 (atualizar todos pelo DJEN e prazo "A conferir"), Spec 014 (publicações do DJEN no processo)

## 1. Contexto
- **Como funciona hoje:**
  - `prazo_service.criar_prazo_a_conferir` cria o prazo "A conferir" quando sai publicação nova num processo assumido. Se o responsável tem OAB e a publicação veio do DJEN, só conta publicação em que a OAB **do responsável** está em `publicacao.oabs` (Spec 014). Sem OAB, ou vindo do DataJud, vale a publicação do processo.
  - `GET /processos/{id}/publicacoes` (`app/routes/processos.py`) devolve `para_mim`: a OAB de **quem está logado** está entre as destinatárias.
  - Na tela (`Dashboard.tsx`), `para_mim` é usado em três lugares: a etiqueta "sua" na aba DJEN, o filtro "Só as minhas" e a sugestão de data ao assumir (`abrirPrevia`).
  - O Argus tem vários escritórios: `usuarios.escritorio_id` e `processos.escritorio_id`.
- **Problema observado:**
  - Um advogado adoece e um colega do mesmo escritório assume o processo. As intimações continuam saindo no DJEN com a OAB do advogado antigo até o substabelecimento ser juntado e o tribunal atualizar. A OAB do novo responsável não está nelas, então **não nasce "A conferir"**, mesmo com o prazo correndo (a intimação ao advogado antigo continua valendo). Apontado pelo Victor na leitura do código; não foi reproduzido na tela.
  - Ao assumir, a data sugerida também ignora a publicação dirigida ao colega.

## 2. Objetivo
- **O que fazer:** contar como "do escritório" a publicação do DJEN dirigida à OAB de qualquer usuário **do mesmo escritório do processo**, tanto para criar o "A conferir" quanto para sugerir a data ao assumir. Na aba DJEN, mostrar a etiqueta "escritório" nessas publicações.
- **Por que fazer:** a troca de advogado dentro do escritório não pode deixar um prazo correndo sem aviso.

## 3. Decisões
- **Decidido:** a lista de OABs vem dos usuários com `escritorio_id` igual ao do **processo**. **Porque** o Argus tem vários escritórios: com a lista de todos os usuários, a intimação do advogado da outra parte que também usa o Argus voltaria a abrir prazo, que é o problema que a Spec 014 resolveu.
- **Decidido:** `para_mim` e a etiqueta "sua" continuam como estão; entra um campo novo `do_escritorio` e a etiqueta "escritório" na publicação que é de um colega e não é sua. **Porque** foi a escolha do Sávio: o advogado continua sabendo o que é dele, e a tela não diz "não é sua" para uma publicação que gerou prazo.
- **Decidido:** o filtro "Só as minhas" continua usando só `para_mim`. **Porque** o nome diz "minhas"; a etiqueta "escritório" já mostra as dos colegas.
- **Decidido:** a sugestão de data ao assumir passa a aceitar `para_mim` **ou** `do_escritorio`. **Porque** é a mesma regra do "A conferir"; quem assume o processo de um colega precisa da data da intimação dele.
- **Decidido:** publicação antiga do colega que gera "A conferir" de algo já resolvido (processo assumido sem nenhum prazo cadastrado) fica como está: o advogado descarta e o prazo não volta. **Porque** foi a escolha do Sávio, e já acontece hoje com a publicação do próprio responsável.
- **Descartado:** contar só publicações posteriores à data em que o novo responsável assumiu. **Porque** essa data não é guardada hoje; precisaria de coluna e migração para um caso que o descarte já resolve.
- **Descartado:** guardar a OAB do responsável anterior no processo. **Porque** só cobre uma troca, precisa de coluna nova e não ajuda quando o processo passa por mais de um advogado.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/service/prazo_service.py` (`criar_prazo_a_conferir`)
  - `app/routes/processos.py` (`GET /processos/{id}/publicacoes`)
  - `frontend/src/types/datajud.ts` (tipo `Publicacao`)
  - `frontend/src/pages/Dashboard.tsx` (`abrirPrevia` e `renderPublicacoesDjen`)
  - `specs/README.md` (linha da spec)
- **Fora de escopo:**
  - Advogado antigo que nunca foi cadastrado no Argus ou que foi excluído: a OAB dele não entra na lista e o comportamento continua o de hoje.
  - Corrigir OAB cadastrada errada.
  - Publicações do DataJud (não trazem destinatário).
  - Mudar o filtro "Só as minhas".
- **Restrições (não pode quebrar):**
  - Responsável sem OAB continua recebendo "A conferir" de qualquer publicação, como hoje.
  - Publicação dirigida só a OAB de fora do escritório continua **não** gerando "A conferir".
  - `para_mim` continua com o mesmo significado e o mesmo nome no JSON.
  - Distribuição continua não abrindo prazo.

## 5. Diretrizes Técnicas
- Em `criar_prazo_a_conferir`, montar a lista uma vez por chamada:
  ```python
  colegas = db.query(Usuario).filter(
      Usuario.escritorio_id == processo.escritorio_id,
      Usuario.oab_numero.isnot(None)
  ).all()
  oabs_do_escritorio = [f"{u.oab_numero}/{u.oab_uf}" for u in colegas]
  ```
  e trocar `minha_oab in p.oabs` por "alguma OAB de `oabs_do_escritorio` está em `p.oabs`". A condição de entrada continua sendo `responsavel.oab_numero` (responsável sem OAB segue a regra de hoje).
- Em `GET /processos/{id}/publicacoes`, montar a mesma lista com `processo.escritorio_id` e devolver `do_escritorio` ao lado de `para_mim`. Código simples, sem função auxiliar compartilhada, se a repetição for só essas linhas.
- Na tela, a etiqueta "escritório" aparece quando `do_escritorio && !para_mim`, com o mesmo estilo da "sua" (`estiloEtiqueta`), em outra cor de etiqueta já existente.
- **Casos de borda:**
  - Colega com `oab_numero` mas sem `oab_uf`: ignorar (não montar `"123/None"`).
  - Publicação com a OAB do responsável **e** a de um colega: conta uma vez só e cria um prazo só.
  - Escritório sem nenhum outro usuário com OAB: comportamento igual ao de hoje.
  - "Atualizar todos" com muitos processos: a consulta dos colegas roda uma vez por processo; é aceitável para o tamanho atual.

## 6. Etapas de Implementação
1. `criar_prazo_a_conferir` com a lista de OABs do escritório. Verificar com o cenário do critério 1 pelo "Atualizar processo".
2. Campo `do_escritorio` em `GET /processos/{id}/publicacoes`. Verificar com `curl` que volta `true` na publicação do colega e `false` na da outra parte.
3. Tipo `Publicacao` com `do_escritorio` e sugestão de data em `abrirPrevia` aceitando `para_mim || do_escritorio`. Verificar na prévia do "Assumir".
4. Etiqueta "escritório" na aba DJEN. Verificar na tela.
5. Linha da spec no `specs/README.md`.

## 7. Critérios de Aceite
- [x] Dado o processo 40 do escritório X, com responsável B (OAB 56977/CE) e um colega A do escritório X com OAB 29442/BA, e a publicação mais recente dirigida só à 29442/BA, quando atualizo pelo DJEN, então nasce um prazo "A conferir" com a data dessa publicação.
- [x] Dado o mesmo processo, mas com a OAB 29442/BA cadastrada num usuário do **escritório Y**, quando atualizo, então **não** nasce prazo "A conferir" dessa publicação.
- [x] Dado o mesmo processo, com a publicação dirigida a uma OAB que nenhum usuário do Argus tem, quando atualizo, então **não** nasce prazo "A conferir".
- [x] Dado um processo assumido por advogado sem OAB, quando sai publicação nova, então o "A conferir" nasce como hoje.
- [x] Dado o cenário do critério 1, quando abro a aba DJEN logado como B, então a publicação da 29442/BA mostra a etiqueta "escritório" e não "sua", e some com "Só as minhas" marcado.
- [x] Dado o cenário do critério 1, com o processo na piscina, quando B abre a prévia do "Assumir", então a data sugerida é a da publicação da 29442/BA.
- [x] Dado um "A conferir" nascido de publicação antiga do colega, quando B descarta e atualiza de novo, então o prazo não volta.

## 8. Testes e Validação
### Automatizados
- O projeto ainda não tem pasta de testes automatizados. A validação é manual.
### Manual
- [x] **Ação:** no escritório do processo 40, cadastrar (ou editar) um usuário com OAB 29442/BA; deixar a publicação mais recente do processo sendo a dirigida à 29442/BA, apagar os prazos posteriores a ela e rodar "Atualizar todos" → **Esperado:** um prazo "A conferir" novo com a data dessa publicação.
- [x] **Ação:** mover esse usuário para outro escritório (ou cadastrar a OAB 29442/BA num usuário de outro escritório), apagar o prazo criado e a publicação, e rodar "Atualizar todos" de novo → **Esperado:** nenhum prazo "A conferir" novo.
- [x] **Ação:** `curl` em `GET /processos/40/publicacoes` com o token de B → **Esperado:** `do_escritorio: true` e `para_mim: false` na publicação da 29442/BA; `para_mim: true` nas da 56977/CE.
- [x] **Ação:** abrir a aba DJEN do processo 40 como B e marcar "Só as minhas" → **Esperado:** etiqueta "escritório" na publicação da 29442/BA, que some com o filtro marcado.
- [x] **Ação:** devolver o processo 40 à piscina e abrir a prévia do "Assumir" como B → **Esperado:** data sugerida igual à da publicação da 29442/BA.
- [x] **Ação:** descartar o "A conferir" criado e rodar "Atualizar todos" → **Esperado:** o prazo não volta.

### Validação feita (2026-11-07)
- Script no container `argus_fastapi_app` montando cada cenário no processo 40 numa transação, com `rollback` no fim (banco conferido depois: prazo 30 e OABs intactos). Responsável Luiz (123321/CE, fora de todas as publicações); colega Sávio com OAB 56977/CE temporária.
  - colega do mesmo escritório → "A conferir" de 14/05/2026 (Intimação)
  - mesma OAB em outro escritório → nenhum prazo
  - OAB de ninguém → nenhum prazo; colega sem UF → ignorado
  - responsável sem OAB → "A conferir" de 14/05/2026, como antes
  - depois de descartar → nenhum prazo novo
  - `listar_publicacoes` como Luiz: `do_escritorio: true` / `para_mim: false` nas da 56977/CE; `false` / `false` na da 29442/BA
- `tsc -b` do front sem erros.
- Testador (nota "Resultado Spec 018", fichário Testes concluídos): os 8 passos passaram no #24, escritório 9, com o admin do escritório como colega (26422/PB). Data sugerida 21/01/2026; etiqueta "escritório" só nas 3 da 26422/PB; A conferir de 21/01/2026 (Despacho); nada com a OAB no escritório 10; descartado não volta; sem OAB → 14/05/2026; 390 px sem rolagem. Dados restaurados.
- Ajuste depois do teste: a frase da prévia dizia "para a sua OAB" também na publicação do colega. Agora diz "para uma OAB do escritório" nesse caso. Retestado nos dois casos: OK.
- **Desvio:** também mudou `app/schemas/publicacao.py` (campo `do_escritorio` no `PublicacaoResponse`), que a seção 4 não listava; sem ele o campo não sai na resposta. Cor da etiqueta: a "neutro" que já existe.

## 9. Perguntas em Aberto
- Qual cor de etiqueta usar para "escritório"? Sugestão: a mesma de "urgente" ou uma neutra, decidir na tela.
- Vale citar no relatório a limitação do advogado antigo não cadastrado ou excluído no Argus?

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
