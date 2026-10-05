# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

## [Não lançado]

### Added
- Consulta de processos na API pública do DataJud (CNJ) a partir do número CNJ, com pré-preenchimento de título, tribunal e tipo de processo no modal de cadastro: valida os 20 dígitos e o dígito verificador antes de consultar, descobre o tribunal automaticamente pelo próprio número e exige autenticação para não expor a cota da chave pública.
- Cálculo de prazos processuais em dias úteis para o foro de Fortaleza/CE: considera fins de semana, feriados nacionais, feriados estaduais do CE, feriados municipais de Fortaleza e o recesso forense (20/dez a 20/jan), tanto para o prazo oficial (pós-publicação) quanto para o prazo interno (petição inicial).
- Peças do processo: envio, listagem, download e exclusão de PDFs (petição inicial, contestação, réplica, recurso e outras petições) guardados no banco, com limite de 10 MB por arquivo. A validação com `pypdf` conta as páginas e recusa PDFs corrompidos ou protegidos por senha. O ADMIN vê as peças pelo botão "📄 Peças" em "Todos os Processos".
- Detecção de processo encerrado pelas movimentações do DataJud: quando o último "Arquivamento Definitivo" (246) é mais recente que a última "Reativação" (849) ou "Desarquivamento" (893), o processo recebe status "Encerrado" com a data de encerramento. Processos encerrados saem da piscina e de "Meus Processos Ativos" e não calculam prazo.
- Liberação de processo para a piscina: o advogado responsável devolve o processo com o botão "Liberar para a piscina", sem apagá-lo.
- Exclusão de processo da piscina pelo ADMIN, pelo botão "Excluir" na tabela "Todos os Processos", com confirmação na própria linha.

### Changed
- Cadastro de processo exige número CNJ e só aceita processo encontrado no DataJud. O botão "Cadastrar Processo" só habilita depois de uma busca bem-sucedida, e o `status` passa a vir somente do DataJud.
- Cadastro de processo não cria mais o "Prazo Inicial". Prazo só existe com data de publicação: `POST /prazos/` exige a data, e `PATCH /prazos/{id}` não aceita removê-la.
- Ao assumir um processo, a data de publicação informada cria um prazo novo. Sem data, o processo fica com "Sem prazo aberto".
- Estimativa de prazo vencida há mais de 30 dias deixa de aparecer como vencida (vermelho ou laranja) e passa a mostrar "Sem prazo em aberto" em cinza.
- Excluir processo passa a ser exclusivo do ADMIN e só vale para processos sem responsável. Nos demais casos, `DELETE /processos/{id}` retorna 400.

### Removed
- Rota `GET /processos/{id}/prazo-movimentacao`, que contava dias corridos desde o cadastro sem considerar feriados nem publicação.
- Prazos internos antigos sem publicação são finalizados por migration de dados. Nada é apagado.
