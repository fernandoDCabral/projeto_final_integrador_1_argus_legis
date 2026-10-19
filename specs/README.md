# Specs

Antes de implementar uma funcionalidade ou correção que não seja trivial, a
gente escreve uma **spec**: um documento curto dizendo o que vai ser feito, por
quê, o que fica de fora e como saber que ficou pronto.

## Como usar

1. Copie `_modelo.md` para `NNN-nome-curto.md` (próximo número livre, com 3
   dígitos: `001-prazo-por-tipo-processo.md`).
2. Preencha. O que ainda não estiver decidido vai para **Perguntas em Aberto**,
   não para **Decisões**.
3. Status:
   - `Rascunho`: ainda em discussão;
   - `Aprovada`: pode implementar;
   - `Implementada`: entrou na `main`, com os checks marcados.
4. No PR da implementação, cite a spec (`Spec 001`).

Quem usa o Claude Code pode pedir "faz uma spec de X": ele investiga o código,
pergunta o que falta e preenche o modelo.

## Lista

| Nº | Spec | Status |
|----|------|--------|
| 001 | [Detectar processo encerrado](001-detectar-processo-encerrado.md) | Implementada |
| 002 | [Revisão da contagem de prazos](002-revisao-contagem-prazos.md) | Implementada |
| 003 | [Peças do processo](003-pecas-do-processo.md) | Implementada |
| 004 | [Avisos ao apagar e enviar peça](004-aviso-pecas.md) | Implementada |
| 005 | [Quando e quem enviou a peça](005-quem-enviou-peca.md) | Implementada |
| 006 | [Endereço do cliente com CEP](006-endereco-com-cep.md) | Implementada |
| 007 | [Nova identidade visual e calendário de prazos](007-nova-identidade-visual.md) | Implementada |
