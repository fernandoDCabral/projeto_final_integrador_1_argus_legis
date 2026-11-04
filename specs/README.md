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
| 008 | [CNJ único por escritório](008-cnj-por-escritorio.md) | Implementada |
| 009 | [Edição de processo presa ao escritório](009-edicao-processo-por-escritorio.md) | Implementada |
| 010 | [Data de publicação pelo DJEN](010-publicacao-pelo-djen.md) | Implementada |
| 011 | [DataJud: resposta parcial e timeout](011-datajud-resposta-parcial.md) | Implementada |
| 012 | [Feedback visual na consulta ao DataJud](012-feedback-consulta-datajud.md) | Implementada |
| 013 | [Atualizar todos pelo DJEN](013-atualizar-todos-pelo-djen.md) | Implementada |
| 014 | [Publicações do DJEN no processo](014-publicacoes-djen.md) | Implementada |
| 015 | [Manter a publicação do DJEN quando o DJEN está fora](015-publicacao-djen-fora.md) | Implementada |
| 016 | [Marcar prazo como cumprido](016-marcar-prazo-cumprido.md) | Implementada |
| 017 | [Sino de alertas de prazo](017-sino-alertas-prazo.md) | Aprovada |
