# Spec 005: Quando e quem enviou a peça
**Status:** Implementada   **Data:** 2026-10-18
**Relacionadas:** [Spec 003 — Peças do processo](003-pecas-do-processo.md) · [Spec 004 — Avisos ao apagar e enviar peça](004-aviso-pecas.md) · issue #73

## 1. Contexto
- **Como funciona hoje:** a tabela `documentos` já guarda `enviado_em` (data e hora) e `enviado_por_id` (`app/models/documento.py`), e o `GET /processos/{id}/documentos` devolve os dois — mas só o **id** de quem enviou. O `Documento` não tem relação com `Usuario`. Na tela, a linha da peça mostra só o dia, sem rótulo e sem hora, junto dos outros dados (`renderPecas`, `Dashboard.tsx` ~linha 527):
  ```
  📄 Contestação
  peca-teste.pdf · 2 páginas · 1 KB · 18/10/2026
  ```
- **Problema observado:** issue #73 (Victor): *"As peças inseridas não possuem informações de data de inserção ou modificação"*. A data existe, mas não dá para saber que é a data de envio; e não aparece quem enviou.

## 2. Objetivo
- **O que fazer:** mostrar em cada peça quando (data e hora) e por quem ela foi enviada, com rótulo: "Enviada em 18/10/2026 às 14:32 por Adv Teste".
- **Por que fazer:** o advogado e o ADMIN precisam saber a origem de cada peça, principalmente quando o processo troca de responsável.

## 3. Decisões
- **Decidido:** a issue é atendida mostrando **quando e quem enviou** — **porque** a data de inserção já existe e só falta clareza, e o nome de quem enviou já está no banco.
- **Decidido:** o backend devolve um campo de texto **`enviado_por_nome`** no `DocumentoResponse`, a partir de uma relação `enviado_por` no model — **porque** é o menor código e não expõe e-mail, OAB e perfil de quem enviou.
- **Decidido:** na tela, a data e o nome vão numa **segunda linha com rótulo**, em cinza, e a data sai da linha de cima — **porque** fica claro o que é cada informação.
- **Descartado:** histórico de peças apagadas (quem apagou e quando) — **porque** exige tabela nova, migration e tela, e não é o que a issue pede.
- **Descartado:** permitir substituir a peça (nova versão) para ter "data de modificação" — **porque** é um recurso novo, bem maior que a issue; hoje peça não se modifica.
- **Descartado:** devolver o usuário inteiro aninhado, como o `responsavel` do processo — **porque** mandaria e-mail e perfil de quem enviou a qualquer advogado que veja a peça na piscina.
- **Descartado:** o frontend descobrir o nome pelo id na lista de usuários — **porque** advogado não tem acesso a essa lista.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - backend (Pedreiro): `app/models/documento.py`, `app/schemas/documento.py`, `app/routes/documentos.py` (se precisar);
  - frontend (Arquiteto): `frontend/src/pages/Dashboard.tsx`.
- **Fora de escopo:** data de modificação; histórico de peças apagadas; o erro 500 ao apagar usuário que enviou peças (ver seção 9); qualquer mudança nas regras de acesso ou na ordem da lista.
- **Restrições (não pode quebrar):** os campos que o `DocumentoResponse` já devolve continuam iguais (`enviado_por_id` inclusive); o `GET` da lista continua sem carregar o PDF (`conteudo` é `deferred`); regras de acesso da Spec 003; confirmação e mensagens da Spec 004. **Sem migration** — as colunas já existem.

## 5. Diretrizes Técnicas
- **Formato da resposta** (contrato fixo entre Pedreiro e Arquiteto — os dois trabalham ao mesmo tempo):
  ```json
  { "id": 6, "processo_id": 23, "tipo": "Contestação", "nome_arquivo": "peca-teste.pdf",
    "tamanho": 1024, "paginas": 2, "enviado_por_id": 13,
    "enviado_por_nome": "Adv Teste", "enviado_em": "2026-10-18T17:32:10.254349Z" }
  ```
  O `enviado_em` vem em **UTC** (`Z`), como sempre veio. O frontend converte com `new Date(...)` e `timeZone: "America/Sao_Paulo"`; nunca cortar a string para pegar dia/hora.
- **Backend:** `enviado_por: Mapped["Usuario"] = relationship(foreign_keys=[enviado_por_id])` no `Documento`; no schema, `enviado_por_nome: str` preenchido com `enviado_por.nome` (o jeito mais simples que funcionar com `from_attributes`). Vale para a lista (`GET /processos/{id}/documentos`) e para a resposta do envio (`POST`).
- **Frontend:** em `renderPecas`, tirar a data da linha de cima e acrescentar a segunda linha em `styles.textoSecundario`: `Enviada em {dd/mm/aaaa} às {hh:mm} por {enviado_por_nome}`, com `timeZone: "America/Sao_Paulo"` como a data de hoje. Sem componente novo.
- A linha nova aparece nas três telas que usam `renderPecas` (processo completo, prévia da piscina, "📄 Peças" do ADMIN) sem código a mais.
- **Casos de borda:**
  - peças antigas: todas têm `enviado_por_id` (coluna obrigatória), então mostram o nome sem ajuste de dados;
  - quem enviou foi apagado: não acontece — o banco não deixa apagar usuário com peças;
  - quem enviou não é mais o responsável (processo liberado e assumido por outro): mostra quem **enviou**, não o responsável atual;
  - nome comprido: quebra linha normalmente;
  - fuso: peça enviada às 23:50 (UTC−3) aparece no mesmo dia, não no seguinte.

## 6. Etapas de Implementação
Pedreiro (1–2) e Arquiteto (3–4) ao mesmo tempo.
1. Relação `enviado_por` no model + `enviado_por_nome` no schema. → `GET /processos/23/documentos` com curl mostra o campo.
2. Conferir o `POST` e os acessos. → resposta do envio já traz o nome; 404 para outro escritório e 403 para quem não é responsável, como antes.
3. Tirar a data da linha de cima e acrescentar a linha "Enviada em … às … por …". → build passa.
4. Conferir as três telas que usam `renderPecas`. → a linha aparece igual nas três.

## 7. Critérios de Aceite
- [x] Dado um processo com peças, quando qualquer usuário com acesso chama `GET /processos/{id}/documentos`, então cada peça vem com `enviado_por_nome` igual ao `nome` do usuário de `enviado_por_id`.
- [x] Dado o advogado responsável, quando envia uma peça (`POST`), então a resposta já vem com `enviado_por_nome` igual ao nome dele.
- [x] Dado um usuário de outro escritório, quando tenta listar as peças, então 404 (sem mudança). *(Pedreiro, curl)*
- [x] Dado o advogado do "Escritorio Teste Assumir", quando envia uma peça no processo #23, então a linha mostra "peca-teste.pdf · 2 páginas · 1 KB" e, embaixo, "Enviada em DD/MM/AAAA às HH:MM por \<nome do advogado\>", com a data e a hora do envio. *("Enviada em 18/10/2026 às 19:19 por Advogado Teste Assumir")*
- [x] Dado essa peça, quando o ADMIN abre "📄 Peças" do #23, então a linha mostra o nome do **advogado** (quem enviou), não o do ADMIN. *(ok)*
- [x] Dado uma peça enviada no #23 e o processo liberado para a piscina, quando outro usuário abre a prévia, então a linha "Enviada em … por \<advogado que enviou\>" aparece. *(ok, e reassumido com 31/07/2026)*
- [x] Dado a hora mostrada na tela, quando comparada com `enviado_em` no banco convertido para UTC−3, então batem. *(banco 22:19 UTC = tela 19:19)*
- [x] Dado uma peça na lista, quando o advogado apaga, então a confirmação e o "Peça apagada." da Spec 004 continuam funcionando. *(ok)*

## 8. Testes e Validação
### Automatizados
- O projeto não tem testes automatizados. Só o build do frontend:
- [x] `npm run build` dentro do container `frontend` passa sem erro. *(18/10, `tsc -b && vite build` → "✓ 74 modules transformed … ✓ built in 72ms")*
### Manual
API (Pedreiro, com curl contra `localhost:8000`):
- [x] **Ação:** `GET /processos/23/documentos` → **Esperado:** cada peça com `enviado_por_nome`. *(200, `"enviado_por_nome":"Advogado Teste Assumir"`, como advogado e como ADMIN)*
- [x] **Ação:** `POST /processos/23/documentos` com um PDF → **Esperado:** resposta com `enviado_por_nome` de quem está logado. *(200, peça id 9 com `"enviado_por_nome":"Advogado Teste Assumir"`; apagada depois)*
- [x] **Ação:** listar como outro escritório / enviar como não responsável → **Esperado:** 404 / 403, como antes. *(GET e POST de outro escritório → 404; POST do ADMIN → 403)*

Tela (Testador, no portal, com a nota "Conta de teste") — 18/10, 6/6 ok, detalhes na nota "Teste Spec 005" do Maestri:
- [x] **Ação:** advogado envia uma peça no #23 → **Esperado:** segunda linha "Enviada em … às … por \<advogado\>"; data some da linha de cima.
- [x] **Ação:** comparar a hora com `enviado_em` no banco (só SELECT) → **Esperado:** batem em UTC−3.
- [x] **Ação:** ADMIN abre "📄 Peças" do #23 → **Esperado:** nome do advogado.
- [x] **Ação:** advogado envia peça, libera o processo para a piscina, abrir a prévia → **Esperado:** linha nova com o nome de quem enviou. Depois, assumir de novo para deixar o #23 como estava.
- [x] **Ação:** apagar a peça → **Esperado:** confirmação e "Peça apagada." como na Spec 004.
- [x] **Ação:** no fim, apagar todas as peças de teste → **Esperado:** processos #23–#25 com 0 peças.

### Desvios da spec
- Nenhum no código. O exemplo da seção 5 foi corrigido: `enviado_em` vem em UTC (`Z`), não com `-03:00`.

## 9. Perguntas em Aberto
- **Fora desta spec:** `DELETE /usuarios/{id}` só bloqueia usuário com processos. Um advogado que enviou peças e não tem mais processo não pode ser apagado (chave estrangeira de `documentos.enviado_por_id`) e a API devolve erro 500 em vez de mensagem clara. Decidir depois (bloquear com mensagem, ou soft-delete da issue #32).
- **Fora desta spec (achado no teste):** `POST /processos/{id}/liberar` não finaliza o prazo aberto. Quem assume de novo cria outro prazo e o processo fica com dois prazos iguais (no teste: #26 e #28 no processo #23). Decidir se liberar deve finalizar o prazo aberto.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
