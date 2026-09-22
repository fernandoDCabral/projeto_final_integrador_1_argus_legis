# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

## [Não lançado]

### Added
- Consulta de processos na API pública do DataJud (CNJ) a partir do número CNJ, com pré-preenchimento de título, tribunal e tipo de processo no modal de cadastro: valida os 20 dígitos e o dígito verificador antes de consultar, descobre o tribunal automaticamente pelo próprio número e exige autenticação para não expor a cota da chave pública.
- Cálculo de prazos processuais em dias úteis para o foro de Fortaleza/CE: considera fins de semana, feriados nacionais, feriados estaduais do CE, feriados municipais de Fortaleza e o recesso forense (20/dez a 20/jan), tanto para o prazo oficial (pós-publicação) quanto para o prazo interno (petição inicial).
