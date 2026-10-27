# Spec 011: DataJud: resposta parcial e timeout
**Status:** Aprovada   **Data:** 2026-10-26
**Relacionadas:** Issue #92 · Spec 001 (detectar processo encerrado: o cadastro exige que o DataJud encontre o processo)

## 1. Contexto
- **Como funciona hoje:**
  - `_buscar_registros` (`app/service/datajud_service.py`) faz o POST no índice do tribunal e devolve `json["hits"]["hits"]`, sem olhar o campo `_shards` da resposta.
  - Se a lista vem vazia, `consultar_processo` responde **404** "Processo não encontrado no DataJud... preencha os dados manualmente".
  - `TIMEOUT_SEGUNDOS = 20` por tentativa. São 3 tentativas (`TENTATIVAS`), mas só o 429 é repetido; timeout e erro de rede viram 502 na hora.
  - A mensagem do 502 (`_indisponivel`) também termina com "preencha os dados manualmente".
- **Problema observado:**
  - **Falso "não encontrado":** em 30/09/2026 o processo do TRF1 `00008323520184013202` voltou com 0 registros numa consulta e completo na seguinte. A causa está documentada no repositório `thiagozs/skills-datajud-djen-jus`: quando o DataJud está sobrecarregado, o Elasticsearch responde **200** tendo consultado só parte dos shards (`_shards.failed > 0`). Se o processo estava num shard que falhou, vem `total = 0`. Pela Spec 001, isso **bloqueia o cadastro** de um processo que existe.
  - **Timeout curto:** em 26/10/2026 uma consulta simples levou **23 s no TJCE** e **31 s no TJSP**, acima dos 20 s atuais.
  - **Mensagem errada:** desde a Spec 001 não dá para cadastrar processo sem o DataJud, então "preencha os dados manualmente" manda o usuário fazer algo impossível.

## 2. Objetivo
- **O que fazer:** tratar a resposta parcial do DataJud como indisponibilidade (com nova tentativa) e não como "não encontrado"; aumentar o timeout para 35 s com teto total de 60 s; corrigir as mensagens de 404 e 502.
- **Por que fazer:** hoje um processo que existe pode ser recusado no cadastro só porque o DataJud estava sobrecarregado naquela hora, e o TJCE, que é o tribunal principal, estoura o timeout com frequência.

## 3. Decisões
- **Decidido:** resposta com `_shards.failed > 0` é **parcial** e ganha nova tentativa, do mesmo jeito que o 429, com a pausa atual de `2 * tentativa` segundos. **Porque** o shard costuma voltar em seguida (foi o que aconteceu em 30/09).
- **Decidido:** se as tentativas acabarem e a última resposta ainda for parcial:
  - **sem registros** → 502 (indisponível), **nunca** 404;
  - **com registros** → usa os registros e grava um aviso no log.

  **Porque** um "não encontrado" que não é confiável bloqueia o cadastro, e um registro que veio é íntegro. Ainda assim, a resposta com registros também é repetida antes, porque o mesmo CNJ pode ter vários registros (um por grau), e a detecção de encerramento da Spec 001 precisa de todos os de 1º grau e Juizado.
- **Decidido:** só é **404** quando `_shards.failed == 0` (ou o campo `_shards` não vier) e não houver registros. **Porque** é o único caso em que "não encontrado" é confiável.
- **Decidido:** `TIMEOUT_SEGUNDOS = 35` e teto total `TEMPO_MAXIMO_SEGUNDOS = 60`. Uma nova tentativa só começa se ainda couber inteira no teto: tempo já gasto + pausa + 35 s ≤ 60 s. **Porque** o TJCE levou 23 s e o TJSP 31 s, mas o advogado está esperando com o modal aberto, e assim o pior caso fica em cerca de 1 minuto.
- **Decidido:** timeout e erro de rede continuam **sem** nova tentativa (502 na hora). **Porque** cada timeout já custou 35 s, e repetir passaria do teto de 60 s.
- **Decidido:** novas mensagens:
  - 502: "O DataJud está sobrecarregado agora. Tente de novo em alguns minutos."
  - 404: "Processo não encontrado no DataJud. Confira o número. Processos recentes ou em segredo de justiça podem demorar a aparecer."

  **Porque** desde a Spec 001 não existe mais cadastro manual.
- **Descartado:** aceitar a resposta parcial com registros logo na primeira tentativa (como sugere o repositório). **Porque** pode faltar o registro de outro grau e o processo seria marcado errado como ativo ou encerrado.
- **Descartado:** timeout de 45 s sem teto total. **Porque** com 3 tentativas o usuário poderia esperar mais de 2 minutos.
- **Descartado:** repetir também o timeout. **Porque** estoura o teto e, segundo o repositório, timeout indica sobrecarga geral, em que insistir não ajuda.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/service/datajud_service.py`:
    - `TIMEOUT_SEGUNDOS = 35`;
    - nova constante `TEMPO_MAXIMO_SEGUNDOS = 60`;
    - em `_buscar_registros`, conferir `_shards.failed`, repetir quando for parcial e respeitar o teto;
    - texto de `_indisponivel()` e do 404 em `consultar_processo`.
- **Fora de escopo:**
  - DJEN (Spec 010).
  - Front: ele já mostra o `detail` que o backend devolve (`mensagemDeErro` no `Dashboard.tsx`), então não precisa mudar.
  - Rotina agendada, circuit breaker, rate limit próprio por usuário.
  - Mudar o número de tentativas (`TENTATIVAS = 3`) ou a pausa do 429.
  - Ler `movimentoNacional` ou datas de 14 dígitos nas movimentações: não apareceram nos 7 índices testados em 26/10/2026.
- **Restrições (não pode quebrar):**
  - O formato do `GET /datajud/{cnj}` e do `POST /processos/{id}/datajud` não muda.
  - Códigos de erro: 422 (CNJ inválido / tribunal sem índice), 404 (não encontrado), 502 (indisponível). Só mudam os textos do 404 e do 502.
  - A detecção de encerramento (Spec 001) e a data de publicação continuam iguais quando a resposta vem completa.

## 5. Diretrizes Técnicas
- Seguir o estilo atual: `urllib`, constantes no topo, o mesmo laço `for tentativa in range(1, TENTATIVAS + 1)`.
- Marcar o início com `time.monotonic()` antes do laço. Antes de cada nova tentativa, conferir se `decorrido + pausa + TIMEOUT_SEGUNDOS <= TEMPO_MAXIMO_SEGUNDOS`. Se não couber, parar.
- Parcial = `resposta.get("_shards", {}).get("failed", 0) > 0`.
- Guardar os registros da última resposta parcial: se as tentativas acabarem e houver registros, devolver esses. Se não houver, levantar `_indisponivel()`.
- Logar com `logger.warning` cada resposta parcial (índice + quantos shards falharam) e quando usar registros parciais.
- **Casos de borda:**
  - `_shards` ausente na resposta → trata como completa (como hoje).
  - 1ª parcial sem registros, 2ª completa com registros → usa a 2ª (caso de 30/09).
  - 3 parciais sem registros → 502 "sobrecarregado", não 404.
  - 1ª resposta leva 30 s e é parcial → 30 + 2 + 35 > 60, não tenta de novo: 502 (ou registros parciais, se houver).
  - 429 seguido de parcial seguido de completa → usa a completa, dentro do teto.
  - Completa sem registros → 404 com a mensagem nova.
  - Timeout na 1ª tentativa → 502 depois de ~35 s, sem nova tentativa.

## 6. Etapas de Implementação
1. Trocar as constantes e os dois textos de mensagem. → Consultar um CNJ válido que não existe mostra o 404 novo no `/docs`.
2. Conferir `_shards` e repetir quando for parcial, com o teto de tempo. → A simulação da seção 8 mostra o comportamento de cada caso.
3. Consultar processos reais do TJCE, do TRT7 e do TJSP pela tela. → Funcionam como antes, agora sem estourar os 20 s.

## 7. Critérios de Aceite
- [x] Dado que o DataJud responde `_shards.failed = 1` e 0 registros na 1ª tentativa e a resposta completa na 2ª, quando consulto o processo, então recebo os dados normalmente (200).
- [x] Dado que o DataJud responde parcial e sem registros nas 3 tentativas, quando consulto, então recebo **502** "O DataJud está sobrecarregado agora. Tente de novo em alguns minutos." e **não** 404.
- [x] Dado que o DataJud responde parcial com 1 registro nas 3 tentativas, quando consulto, então recebo esse registro (200) e o log mostra o aviso de resposta parcial.
- [x] Dado que o DataJud responde completo (`_shards.failed = 0`) e sem registros, quando consulto, então recebo **404** "Processo não encontrado no DataJud. Confira o número. Processos recentes ou em segredo de justiça podem demorar a aparecer."
- [x] Dado que a 1ª resposta demora 30 s e vem parcial, quando consulto, então não há 2ª tentativa e a resposta sai em menos de 60 s.
- [x] Dado que a resposta do TJCE leva 23 s, quando consulto, então ela chega (não estoura em 20 s como antes).
- [x] Dado um processo do TJCE já testado, como o `3003705-20.2025.8.06.0071`, quando consulto, então classe, movimentações, data de publicação e encerramento vêm iguais aos de antes da mudança.

## 8. Testes e Validação
### Automatizados
- O projeto ainda **não tem pasta de testes automatizados**. A validação é manual, abaixo.
### Manual
- [x] **Ação:** simular as respostas no shell do container (`docker compose exec app python`), trocando `urllib.request.urlopen` dentro do `datajud_service` por uma função falsa que devolve, em sequência, os JSONs de cada caso da seção 5 (parcial sem registros, parcial com registros, completa sem registros, completa com registros) e chamando `consultar_processo("<cnj do TJCE>", SessionLocal())` (o 404 sai de `consultar_processo`, não de `_buscar_registros`) → **Esperado:** o resultado de cada critério da seção 7 (registros, 502 ou 404), conferindo o `status_code` e o `detail` da `HTTPException`.
- [x] **Ação:** na mesma simulação, fazer a função falsa esperar 30 s e devolver parcial → **Esperado:** só 1 chamada e erro em menos de 60 s.
- [x] **Ação:** no `/docs`, `GET /datajud/3003705-20.2025.8.06.0071` → **Esperado:** 200 com os mesmos dados de antes.
- [x] **Ação:** no `/docs`, `GET /datajud/` com um CNJ de dígito verificador válido que não existe → **Esperado:** 404 com a mensagem nova.
- [x] **Ação:** pela tela, "Buscar no DataJud" no cadastro e "Atualizar DataJud" num processo já cadastrado → **Esperado:** funcionam; se der erro, a mensagem nova aparece no modal.
- [x] **Ação:** `docker compose logs app` depois das simulações → **Esperado:** avisos de resposta parcial com o índice e o número de shards que falharam.

## 9. Perguntas em Aberto
- Nenhuma no momento.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
