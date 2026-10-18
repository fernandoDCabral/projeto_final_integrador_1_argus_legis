# Spec 006: Endereço do cliente com CEP
**Status:** Implementada   **Data:** 2026-10-18
**Relacionadas:** issue #75 (Sprint 4)

## 1. Contexto
- **Como funciona hoje:** o endereço do cliente é um texto livre só: coluna `clientes.endereco` (`String(255)`, `app/models/cliente.py`) e um campo "Endereço" no cadastro, com o exemplo "Rua, nº, bairro, cidade/UF" (`Dashboard.tsx` ~linha 970). Não existe campo de CEP nem tela de editar cliente (só cadastrar e excluir). A tela do processo completo mostra `processo.cliente.endereco` (~linha 1207). Em 18/10 o banco tem 4 clientes, com endereços como "Rua Um, numero 2" e "rua 1, casa 3".
- **Problema observado:** issue #75 (Victor): *"Necessário incluir uma API de CEP para automatizar o cadastro do cliente"*.

## 2. Objetivo
- **O que fazer:** guardar o endereço em campos separados (CEP, rua, número, complemento, bairro, cidade, UF) e, no cadastro, preencher rua, bairro, cidade e UF sozinhos a partir do CEP, com uma rota nossa que consulta o ViaCEP.
- **Por que fazer:** cadastro mais rápido e endereços padronizados, em vez de texto livre escrito de cada jeito.

## 3. Decisões
- **Decidido:** endereço em **colunas separadas** — **porque** fica organizado e padronizado (dá para filtrar por cidade, por exemplo).
- **Decidido:** a migration **copia o `endereco` antigo inteiro para `logradouro`** e apaga a coluna `endereco` — **porque** texto livre não dá para separar com segurança, assim nada se perde e a tabela fica só com o formato novo.
- **Decidido:** a consulta ao CEP passa pelo **backend** (`GET /cep/{cep}`), no padrão do `datajud_service.py`, com `urllib` — **porque** segue o padrão de serviço externo do projeto, trocar de fornecedor muda um arquivo só, exige login e dá para testar com curl. Sem dependência nova.
- **Decidido:** fornecedor **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) — **porque** é gratuito, sem chave, e respondeu certo no teste (60160-230 → Avenida Dom Luís, Meireles, Fortaleza/CE).
- **Decidido:** preenche sozinho ao completar 8 dígitos e **todos os campos continuam editáveis**; se a consulta falhar, mensagem e preenchimento à mão — **porque** o cadastro nunca trava por causa de serviço externo.
- **Descartado:** manter um texto só e o CEP só ajudar a preencher — **porque** o Sávio preferiu os campos separados.
- **Descartado:** texto só + coluna `cep` — **porque** fica no meio do caminho.
- **Descartado:** manter `endereco` ao lado das colunas novas — **porque** o código teria que tratar dois formatos para sempre.
- **Descartado:** apagar os endereços antigos — **porque** perde dado e não existe tela de editar cliente.
- **Descartado:** frontend chamar o ViaCEP direto — **porque** foge do padrão do DataJud e prende a tela a um site de fora.
- **Descartado:** botão "Buscar CEP" — **porque** é um clique a mais; o usuário espera o preenchimento automático.
- **Descartado:** travar rua/bairro/cidade/UF depois de preencher — **porque** impede o cadastro com o ViaCEP fora do ar e CEP geral de cidade pequena vem sem rua.

## 4. Escopo
- **Arquivos a alterar/criar:**
  - backend (Pedreiro): `app/models/cliente.py`, `app/schemas/cliente.py`, nova migration em `alembic/versions/`, novos `app/service/cep_service.py`, `app/routes/cep.py` e `app/schemas/cep.py`, `app/main.py` (registrar o router), `app/routes/__init__.py` e `app/schemas/__init__.py` (imports);
  - frontend (Arquiteto): `frontend/src/pages/Dashboard.tsx`, `frontend/src/types/cliente.ts`.
- **Fora de escopo:** tela de editar cliente (o `PATCH /clientes/{id}` só ganha os campos novos); endereço de escritório; filtro de clientes por cidade; validar se o CEP bate com a cidade digitada à mão.
- **Restrições (não pode quebrar):** os 4 clientes atuais continuam listando e aparecendo nos processos; validação de CPF/CNPJ por tipo de pessoa; isolamento por escritório nas rotas de cliente; `requirements.txt` sem dependência nova.

## 5. Diretrizes Técnicas
- **Colunas** (todas `nullable=True` no banco, por causa dos clientes antigos):

  | Coluna | Tipo | No `ClienteCreate` |
  |---|---|---|
  | `cep` | `String(8)`, só dígitos | obrigatório |
  | `logradouro` | `String(255)` | obrigatório |
  | `numero` | `String(20)` (aceita "s/n") | obrigatório |
  | `complemento` | `String(100)` | opcional |
  | `bairro` | `String(100)` | obrigatório |
  | `cidade` | `String(100)` | obrigatório |
  | `uf` | `String(2)` | obrigatório |

- **Migration:** `upgrade` cria as 7 colunas, copia `endereco` → `logradouro` e apaga `endereco`. `downgrade` recria `endereco` juntando os campos não vazios (ex.: "Rua X, 12, apto 1 - Bairro, Cidade/UF - CEP 60160230") e apaga as 7 colunas.
- **Schemas:**
  - `ClienteCreate`: 6 obrigatórios + `complemento` opcional. CEP aceita "60160-230" ou "60160230" e guarda só os 8 dígitos; UF com 2 letras, guardada em maiúscula.
  - `ClienteUpdate`: os 7 opcionais.
  - `ClienteResponse`: os 7 opcionais (leitura permissiva, como o docstring do arquivo já explica).
- **Contrato `GET /cep/{cep}`** (fixo entre Pedreiro e Arquiteto — trabalham ao mesmo tempo):
  - exige login (`get_current_user`);
  - `200` → `{ "cep": "60160230", "logradouro": "Avenida Dom Luís", "bairro": "Meireles", "cidade": "Fortaleza", "uf": "CE" }` (campos que o ViaCEP manda vazios vêm `""`);
  - `400` → CEP sem 8 dígitos (depois de tirar o traço);
  - `404` → CEP inexistente (o ViaCEP responde `{"erro": true}`);
  - `503` → ViaCEP fora do ar, erro ou mais de **5 segundos**.
  - O `complemento` do ViaCEP **não** é devolvido (descreve a rua, ex. "lado ímpar", não o endereço do cliente).
- **Formulário:** CEP com máscara `00000-000`; ao completar 8 dígitos, chama `GET /cep/{cep}` mostrando "Buscando CEP..."; no `200` preenche rua, bairro, cidade e UF e põe o foco no Número; no `404` "CEP não encontrado. Preencha o endereço à mão."; em qualquer outro erro "Não foi possível consultar o CEP agora. Preencha o endereço à mão.". Envia os 7 campos com o CEP sem traço.
- **Processo completo:** "Endereço" monta o texto pulando o que estiver vazio: `Avenida Dom Luís, 123, apto 101 — Meireles, Fortaleza/CE — CEP 60160-230`. Cliente antigo aparece só com o texto copiado para a rua.
- **Casos de borda:**
  - trocar o CEP depois de mexer nos campos → nova busca sobrescreve rua, bairro, cidade e UF, mas **não** número e complemento;
  - CEP geral de cidade pequena (ex. `62766-000`, Guaramiranga/CE) → vem sem rua e bairro; preenche só cidade e UF;
  - ViaCEP lento → 503 depois de 5 s; cadastro segue à mão;
  - CEP digitado com traço ou sem → mesmo resultado.

## 6. Etapas de Implementação
Pedreiro (1–4) e Arquiteto (5–7) ao mesmo tempo.
1. Model + migration. → `alembic upgrade head`; os 4 clientes antigos com o texto em `logradouro`; `downgrade -1` e `upgrade head` de novo sem perder dado.
2. Schemas de cliente. → `POST /clientes/` com os campos novos dá 200; sem um obrigatório dá 422.
3. `cep_service.py` + `routes/cep.py` + registro no `main.py`. → curl dos 4 casos do contrato.
4. Conferir que listar clientes e abrir processo continuam funcionando com clientes antigos. → `GET /clientes/` 200.
5. `types/cliente.ts` e formulário com os campos novos e a máscara de CEP. → build passa.
6. Busca automática do CEP, mensagens e foco no Número. → build passa.
7. Endereço montado no processo completo. → build passa.

## 7. Critérios de Aceite
- [x] Dado os 4 clientes de antes, quando a migration roda, então cada um fica com o texto antigo de `endereco` em `logradouro` e os outros campos vazios, e a coluna `endereco` não existe mais. *(migration f6a7b8c9d0e1; clientes 1, 4, 5, 6 com o texto em `logradouro`; `information_schema` sem `endereco`)*
- [x] Dado a migration aplicada, quando roda `downgrade -1` e `upgrade head`, então os clientes antigos voltam com o mesmo `logradouro`. *(Pedreiro, SELECT antes/depois iguais)*
- [x] Dado um usuário logado, quando chama `GET /cep/60160230`, então 200 com `logradouro` "Avenida Dom Luís", `bairro` "Meireles", `cidade` "Fortaleza", `uf` "CE".
- [x] Dado um usuário logado, quando chama `GET /cep/99999999`, então 404; `GET /cep/123` → 400; sem login → 401. *(curl: 404 / 400 / 401; 503 conferido com a URL apontando para IP que não responde, em 5,0 s)*
- [x] Dado `POST /clientes/` sem `numero`, então 422; com os 6 obrigatórios e CEP "60160-230", então 201 e o CEP é guardado como "60160230". *(422 `missing numero`; 201 com `"cep":"60160230"`, `"uf":"CE"` a partir de "ce")*
- [x] Dado o formulário de cliente, quando o advogado digita o CEP 60160-230, então rua, bairro, cidade e UF são preenchidos e o foco vai para o Número. *(60160-230 → Avenida Dom Luís / Meireles / Fortaleza / CE; foco no Número)*
- [x] Dado um CEP inexistente, quando termina de digitar, então aparece "CEP não encontrado. Preencha o endereço à mão." e dá para cadastrar preenchendo à mão. *(99999-999; cadastro à mão ok)*
- [x] Dado rua e número preenchidos, quando troca o CEP, então rua/bairro/cidade/UF mudam e número e complemento continuam. *(troca para 62766-000 → Guaramiranga/CE)*
- [x] Dado um processo de cliente antigo, quando abre o processo completo, então "Endereço" mostra o texto antigo; dado um cliente novo, mostra `Rua, nº, compl — Bairro, Cidade/UF — CEP 00000-000`. *(antigo: #23 mostra "Rua Teste, 1, Fortaleza/CE" na tela. Novo: conferido pelo `GET /clientes/8` + `enderecoDoCliente` — o cliente novo não tinha processo, então não foi visto na tela)*

## 8. Testes e Validação
### Automatizados
- O projeto não tem testes automatizados. Só o build do frontend:
- [x] `npm run build` dentro do container `frontend` passa sem erro. *(18/10: "✓ 74 modules transformed … ✓ built in 88ms")*
### Manual
Banco e API (Pedreiro, curl contra `localhost:8000`):
- [x] **Ação:** `alembic upgrade head` → **Esperado:** 4 clientes antigos com o texto em `logradouro`; `endereco` não existe.
- [x] **Ação:** `alembic downgrade -1` e `upgrade head` → **Esperado:** mesmo `logradouro` no fim.
- [x] **Ação:** `GET /cep/60160230`, `/cep/99999999`, `/cep/123`, sem token → **Esperado:** 200 / 404 / 400 / 401.
- [x] **Ação:** `POST /clientes/` sem `numero` e completo → **Esperado:** 422 e 201 (CEP sem traço). Apagar o cliente de teste. *(cliente 7 criado e apagado)*

Tela (Testador, no portal, com a nota "Conta de teste") — 18/10, 9/9 ok, detalhes na nota "Teste Spec 006" do Maestri:
- [x] **Ação:** cadastrar cliente com CEP 60160-230, número e complemento → **Esperado:** campos preenchidos sozinhos, foco no Número, cliente cadastrado.
- [x] **Ação:** CEP 99999-999 → **Esperado:** mensagem de não encontrado; cadastro à mão funciona.
- [x] **Ação:** preencher rua e número, depois trocar o CEP para 62766-000 → **Esperado:** cidade Guaramiranga/CE, rua e bairro vazios, número e complemento mantidos.
- [x] **Ação:** processo #23 (cliente antigo) no processo completo → **Esperado:** endereço antigo aparece.
- [x] **Ação:** endereço de cliente novo no processo completo (se não der para cadastrar processo para ele, conferir pelo `GET /clientes/{id}` e avisar o Maestro) → **Esperado:** texto montado no formato da seção 5.
- [x] **Ação:** no fim, apagar os clientes de teste → **Esperado:** só os clientes de antes.

### Desvios da spec
- CEP de exemplo: `63900-000` (Quixadá) não existe no ViaCEP; trocado por `62766-000` (Guaramiranga/CE).
- `POST /clientes/` responde **201** (sempre respondeu); a spec dizia 200.
- Arquivos a mais: `app/schemas/cep.py` (padrão do `schemas/datajud.py`) e os imports em `__init__.py`.
- Frontend: a busca só dispara quando os 8 dígitos mudam; `formatarCep` e `enderecoDoCliente` ficaram no topo do `Dashboard.tsx`; num CEP geral, a rua digitada antes fica vazia (a do CEP antigo não vale mais).
- Downgrade: a montagem do texto é de ida só — depois de `downgrade` + `upgrade`, um cliente novo fica com o endereço todo em `logradouro`. Os antigos voltam idênticos.

## 9. Perguntas em Aberto
- Nenhuma.

## 10. Instruções para a IA
- Se algo não estiver coberto nesta spec, **pare e pergunte**.
- Entregue apenas os trechos alterados, com comentários explicativos.
- Ao final, envie um resumo com cada check marcado **+ evidência** (saída do comando/teste) e liste qualquer desvio da spec com o motivo.
