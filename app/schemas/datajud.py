from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional

class MovimentacaoDatajud(BaseModel):
    data: date
    # Nulo quando o tribunal informou só o dia, sem horário
    hora: Optional[str] = None
    codigo: Optional[int] = None
    nome: str

class ConsultaDatajudResponse(BaseModel):
    cnj: str
    tribunal: str
    grau: Optional[str] = None
    orgao_julgador: Optional[str] = None
    classe: Optional[str] = None
    assuntos: List[str]
    data_ajuizamento: Optional[date] = None
    # Quando o CNJ atualizou o registro — não é a data da última movimentação
    atualizado_em: Optional[datetime] = None

    # Sugestões para o formulário de processo; o usuário confere antes de salvar
    titulo_sugerido: Optional[str] = None
    tipo_processo_sugerido: Optional[str] = None

    # Última publicação no Diário (CPC art. 224), já ajustada quando o
    # tribunal só registrou a disponibilização. Nula se não houver nenhuma
    data_publicacao: Optional[date] = None
    # Dia em que saiu no diário (DJEN ou movimento 1061); nula se só houver o 92
    data_disponibilizacao: Optional[date] = None
    # "DJEN" ou "DataJud" (Spec 010). Tipo, link e hash só vêm do DJEN
    fonte_publicacao: Optional[str] = None
    tipo_publicacao: Optional[str] = None
    link_publicacao: Optional[str] = None
    hash_publicacao: Optional[str] = None
    # Indício (não prova) de que a publicação já foi respondida
    peticao_apos_publicacao: bool = False
    # Data do arquivamento definitivo; nula se o processo não acabou (Spec 001)
    encerrado_em: Optional[date] = None

    # Da mais recente para a mais antiga
    movimentacoes: List[MovimentacaoDatajud]
