# Spec 003: Peças do processo
**Status:** Aprovada   **Data:** 2026-10-04
**Relacionadas:** Spec 001 (processo encerrado), branch `feat/liberar-excluir-processo` (Victor — devolver à piscina e excluir processo), futura spec de deploy

## 1. Contexto
- **Como funciona hoje:**
  - O Argus guarda os dados dos processos no banco do servidor; ao logar em qualquer máquina, o advogado vê "Meus processos". Mas as **peças** (petição, contestação, recurso) ficam espalhadas em pastas no computador de cada um — o sistema não tem nenhum tipo de upload de arquivo.
  - Acesso a processo: `verificar_acesso_ao_processo` (`app/utils/autorizacao.py`) barra outro escritório com 404 e, em processo com responsável, devolve 403 para qualquer outro usuário — **inclusive o ADMIN**.
  - `python-multipart` (necessário para upload no FastAPI) já está no `requirements.txt`.
- **Problema observado:** o advogado precisa olhar "pastas e mais pastas no PC" para achar as peças de um processo, e em outra máquina elas simplesmente não estão.
- **Medição (03/10/2026, 9 PDFs públicos — peças reais e modelos):** peças de texto têm 200–850 KB mesmo com 20–77 páginas (5–45 KB por página). Estimativa: ~1 MB de peças por processo → um banco gratuito de 0,5–1 GB comporta 500–1.000 processos.
- **Prova (04/10/2026):** um PDF de 299.062 bytes gravado numa tabela temporária do Postgres (`BYTEA`) e lido de volta saiu idêntico (mesmo SHA-256 `92408cc32488800e…`), reconhecido como "PDF document, version 1.5, 18 pages".

## 2. Objetivo
- **O que fazer:** permitir enviar, listar, baixar e apagar as peças (PDF) de cada processo, guardadas no próprio banco, com as regras de acesso abaixo.
- **Por que fazer:** o processo e as suas peças ficam num lugar só, acessível de qualquer máquina (depois do deploy), em vez de pastas locais.

## 3. Decisões
- **Decidido:** só **peças** (petição inicial, contestação, réplica, recurso, outras petições), em PDF — **porque** são PDFs de texto, pequenos, e é o que o advogado precisa ter à mão.
- **Decidido:** guardar o PDF **no próprio banco** (`BYTEA`) — **porque** é o mais simples: sem conta, chave ou biblioteca de armazenamento nova, funciona igual no Docker local e no deploy, e vai junto no backup. A ~1 MB por processo cabe no plano gratuito.
- **Decidido:** **tipo da peça numa lista fixa**: Petição inicial, Contestação, Réplica, Recurso, Petição (outras) — **porque** a lista fica clara, permite filtrar no futuro e segue o padrão do `tipo_processo`.
- **Decidido:** limite de **10 MB** por arquivo — **porque** cobre com folga até peças longas com imagens e barra outros usos.
- **Decidido — acesso:**

  | Ação | Quem pode |
  |---|---|
  | Ver a lista (tipo, nome, tamanho, páginas, data) | quem já vê o processo (responsável; advogados enquanto está na piscina) + ADMIN |
  | Baixar o PDF | advogado **responsável** + **ADMIN** |
  | Enviar e apagar | **só o advogado responsável** |

  **Porque:** na piscina o advogado vê que existem peças para decidir se assume, mas o conteúdo só abre depois de assumir; o ADMIN baixa para o escritório não perder as peças se o advogado sair; quem envia é quem redige.
- **Decidido:** a lista de documentos **não** vem dentro do `ProcessoResponse`; tem rota própria — **porque** senão toda tela que carrega processos baixaria os PDFs junto.
- **Decidido:** usar **`pypdf`** para contar páginas e validar o PDF — **porque** mostra "12 páginas" e recusa PDF corrompido ou com senha com mensagem clara; é pequena e só Python.
- **Descartado:** serviço de arquivos (Cloudflare R2, AWS S3) — **porque** traz conta, chaves e `boto3` a mais para o TCC; dá para migrar depois mexendo só no backend.
- **Descartado:** pasta no disco do servidor — **porque** os planos gratuitos costumam apagar o disco a cada deploy.
- **Descartado:** anexos escaneados e "qualquer PDF" — **porque** pesam 3–4× mais (página escaneada ≈ 100–500 KB, estimativa) e não são o foco.
- **Descartado:** ADMIN ou advogados da piscina enviarem peças — **porque** criaria peça em processo sem dono.
- **Decidido (na implementação, 04/10/2026):** o ADMIN vê as peças por um botão **"📄 Peças"** em cada linha de "Todos os Processos", que abre a lista embaixo da linha com o Baixar — **porque** o ADMIN não tem tela de processo aberto, e essa é a mudança menor, reaproveitando a mesma seção "Peças".
- **Descartado:** tela de processo completo só leitura para o ADMIN — **porque** é uma tela nova, maior que esta spec.
- **Descartado:** só o nome do arquivo como identificação — **porque** fica bagunçado (`contestacao_final_v3.pdf`).

## 4. Escopo
- **Arquivos a alterar/criar:**
  - `app/models/documento.py` (novo) + `app/models/__init__.py` + relação `documentos` em `app/models/processo.py` (`cascade="all, delete-orphan"`).
  - `alembic/versions/<nova>.py` — tabela `documentos`.
  - `app/schemas/documento.py` (novo) + `app/schemas/__init__.py` — resposta da lista (sem `conteudo`).
  - `app/routes/documentos.py` (novo) + registrar no `app/main.py`.
  - `requirements.txt` — `pypdf`.
  - `frontend/src/pages/Dashboard.tsx` — seção "Peças" na prévia da piscina e no processo completo.
- **Tabela `documentos`:** `id`, `processo_id` (FK), `tipo`, `nome_arquivo`, `tamanho` (bytes), `paginas`, `conteudo` (`BYTEA`), `enviado_por_id` (FK usuários), `enviado_em`.
- **Rotas:**

  | Rota | Faz | Quem |
  |---|---|---|
  | `GET /processos/{id}/documentos` | lista sem o conteúdo | quem vê o processo + ADMIN |
  | `POST /processos/{id}/documentos` | recebe `arquivo` + `tipo` (form), valida e grava | só o responsável |
  | `GET /documentos/{doc_id}/arquivo` | devolve o PDF (`application/pdf`, nome original) | responsável + ADMIN |
  | `DELETE /documentos/{doc_id}` | apaga | só o responsável |
- **Fora de escopo:**
  - Deploy (spec própria) — sem ele, a "pasta única" só existe na máquina onde o Docker roda.
  - Visualizar o PDF dentro da tela, anexos escaneados, busca no texto das peças, detectar arquivo duplicado.
  - Aviso "este processo tem N peças" ao excluir processo — a tela de exclusão vem na branch do Victor; fazer quando ela entrar.
  - Refatorar `verificar_acesso_ao_processo`.
- **Restrições (não pode quebrar):**
  - Isolamento entre escritórios (404 indistinguível para outro escritório).
  - Formato de `ProcessoResponse` (não ganha documentos).
  - Migrations do Alembic (nada de `create_all`).

## 5. Diretrizes Técnicas
- Código direto, no estilo do projeto.
- **ADMIN:** as rotas buscam o processo filtrando pelo escritório (404 se não achar). Se o usuário é ADMIN, pode listar e baixar; senão, aplica a regra normal (responsável, ou piscina só para listar). Não usar `verificar_acesso_ao_processo` para o ADMIN, porque ela dá 403 para ele.
- Ler o upload com limite: parar em 10 MB + 1 byte e responder 413, sem carregar o resto.
- Validar com `pypdf` (abre, conta páginas); PDF que não abre ou está criptografado → 422.
- Download: `Content-Disposition` com o nome original codificado em UTF-8 (`filename*=`), para nomes com acento.
- Frontend: baixar via axios com o token (`responseType: "blob"`) e entregar ao navegador como download com o nome original.
- Constantes: `TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024` e `TIPOS_DOCUMENTO = [...]` no `documentos.py`.
- **Casos de borda:**
  - Processo devolvido à piscina: as peças ficam; quem assumir passa a baixar; o ex-responsável perde o download.
  - Processo encerrado: peças continuam visíveis/baixáveis, e o responsável ainda pode enviar.
  - Excluir processo apaga as peças (cascade).
  - Mesmo arquivo enviado duas vezes: aceito.
  - Arquivo vazio: 422 (não é PDF).

## 6. Etapas de Implementação
1. `pypdf` no `requirements.txt` e rebuild do container. → `import pypdf` funciona dentro do container.
2. Model + migration. → `alembic upgrade head` cria a tabela; `downgrade -1` remove.
3. Schema + rotas de listar e enviar. → `POST` do parecer da PGR responde 18 páginas; `GET` lista sem conteúdo.
4. Rotas de baixar e apagar + regras de acesso. → SHA-256 do baixado igual ao original; 403/404 nos casos da seção 7.
5. Frontend: seção "Peças" na prévia (só lista) e no processo completo (lista + Baixar + Apagar + Enviar). → conferir na tela.

## 7. Critérios de Aceite
- [x] Dado o processo assumido, quando o responsável envia o parecer da PGR (292 KB, 18 páginas) como "Petição (outras)", então a lista mostra "18 páginas · 292 KB" com tipo, nome e data. *(API: 200, 299.062 bytes, 18 páginas)*
- [x] Dado esse documento, quando o responsável baixa, então o arquivo tem o mesmo SHA-256 do original e o nome original. *(`92408cc32488800e` nos dois; `application/pdf`, `filename="parecer.pdf"`)*
- [x] Dado o mesmo documento, quando o ADMIN do escritório baixa, então 200. *(API: 200 — na tela ainda não, ver seção 9)*
- [x] Dado um processo na piscina com peças, quando um advogado do escritório lista, então vê a lista; quando tenta baixar, então 403. *(lista 200, baixa 403, envia 403)*
- [x] Dado um usuário de outro escritório, quando tenta listar, baixar ou apagar, então 404. *(404 / 404 / 404)*
- [x] Dado um advogado que não é o responsável (e o ADMIN), quando tenta enviar ou apagar, então 403. *(ADMIN envia 403, apaga 403)*
- [x] Dado um arquivo de texto renomeado para `.pdf`, quando envio, então 422 "Envie um arquivo PDF." *(também: corrompido → 422 "pode estar corrompido"; com senha → 422 "protegido por senha")*
- [x] Dado um arquivo de 11 MB, quando envio, então 413. *(413 "O arquivo passa de 10 MB.")*
- [x] Dado um tipo fora da lista, quando envio, então 422.
- [x] Dado um arquivo `contestação.pdf`, quando baixo, então o nome chega com acento. *(`filename*=UTF-8''contesta%C3%A7%C3%A3o.pdf`)*
- [x] Dado um processo excluído, então as peças dele somem da tabela. *(1 → 0)*
- [x] Dado `GET /processos/` e `GET /processos/{id}`, então a resposta **não** traz documentos nem conteúdo.

## 8. Testes e Validação
### Automatizados
- [x] O projeto **ainda não tem** pasta `tests/` nem suíte automatizada. Esta spec não cria uma; a validação é manual (abaixo).
### Manual
- [x] **Ação:** `alembic upgrade head`, `downgrade -1` e `upgrade head` → **Esperado:** tabela criada, removida e criada de novo sem erro.
- [x] **Ação:** enviar, listar, baixar (comparar SHA-256) e apagar pela API com os PDFs públicos medidos → **Esperado:** critérios da seção 7.
- [x] **Ação:** tokens de advogado da piscina, ADMIN e escritório de teste → **Esperado:** 403 / 200 / 404 conforme a tabela de acesso.
- [ ] **Ação:** na tela, assumir um processo, enviar uma peça, baixar e apagar → **Esperado:** funciona; o arquivo baixado abre no leitor de PDF.
- [ ] **Ação:** abrir a prévia de um processo da piscina com peças → **Esperado:** lista sem botão de baixar.
- [ ] **Ação:** como ADMIN, em "Todos os Processos", clicar em "📄 Peças" → **Esperado:** lista embaixo da linha, com Baixar e sem Apagar/Enviar.

## 9. Perguntas em Aberto
- Nenhuma no momento.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
