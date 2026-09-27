# Contratempos — Argus Legis

Registro dos problemas sérios que encontramos no meio do desenvolvimento e o
que foi feito para corrigir. Serve de referência rápida para a apresentação do
TCC, caso a banca pergunte sobre dificuldades encontradas pelo caminho.

---

## 1. Vazamento de dados entre escritórios (multi-tenant quebrado)

**Data:** 27/09/2026

**O que estava errado:** o sistema foi desenhado para isolar os dados de cada
escritório de advocacia — um escritório não pode ver processo, cliente ou
prazo de outro. Esse isolamento estava implementado corretamente nas rotas de
clientes, mas **não** nas rotas de processos e prazos. A checagem de acesso
(`verificar_acesso_ao_processo`) olhava apenas se o usuário era o "responsável"
pelo processo — e todo processo recém-cadastrado nasce sem responsável (fica
numa "piscina" até alguém assumir). Nesse estado, a função liberava o acesso
para **qualquer usuário autenticado, de qualquer escritório**.

**Como percebemos:** revisando a modelagem do banco e o fluxo de autorização
de cada rota, notamos que só `GET /processos/{id}`, `PATCH`, `DELETE` e as
rotas de `/prazos/` dependiam dessa função, e nenhuma delas comparava o
escritório de quem pedia com o dono do processo.

**Confirmação prática:** reproduzimos o ataque de verdade — dois escritórios
de teste, um cliente e processo sigilosos num deles (sem responsável, estado
normal), e um advogado autêntico do outro escritório tentando acessar pelo ID.
Antes da correção, `GET`/`PATCH`/`DELETE` do processo e as operações de prazo
vazavam e permitiam editar/apagar dado de terceiro (incluindo CPF, endereço e
telefone do cliente, que vêm aninhados na resposta).

**Como corrigimos:** a função de autorização passou a receber também o
`escritorio_id` de quem faz a requisição e barra o acesso (com 404, para não
nem confirmar que o processo existe) antes de checar qualquer outra regra. Os
8 pontos do código que chamavam essa função foram atualizados para passar essa
informação. Depois da correção, o mesmo ataque (com o mesmo advogado real,
mesmo processo sem responsável) voltou 404 em todos os casos.

---

<!-- Próximo contratempo: copiar o formato acima (data, o que estava errado,
como percebemos, confirmação prática, como corrigimos). -->
