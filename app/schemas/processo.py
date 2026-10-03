from pydantic import BaseModel, ConfigDict, AfterValidator
from typing import Optional
from datetime import date, datetime
from typing import List, Annotated
from .usuario import UsuarioResponse
from .cliente import ClienteResponse
from .prazo import PrazoResponse
from .datajud import MovimentacaoDatajud
from ..utils.validators import padroniza_cnj

CNJ = Annotated[str, AfterValidator(padroniza_cnj)]

class ProcessoBase(BaseModel):
    # cnj é opcional: processos ainda não protocolados no tribunal (pool como
    # petição inicial) não têm número CNJ até o protocolo.
    cnj: Optional[CNJ] = None
    titulo: str
    # Escopo do projeto restrito ao Ceará: tribunal tem default TJCE, mas
    # outros valores continuam aceitos se enviados explicitamente.
    tribunal: Optional[str] = "TJCE"
    status: str = "Ativo"
    tipo_processo: str

    # Vêm da consulta ao DataJud feita no cadastro; todos opcionais
    classe: Optional[str] = None
    orgao_julgador: Optional[str] = None
    grau: Optional[str] = None
    data_ajuizamento: Optional[date] = None
    assuntos: Optional[List[str]] = None
    movimentacoes: Optional[List[MovimentacaoDatajud]] = None
    datajud_atualizado_em: Optional[datetime] = None
    data_publicacao_datajud: Optional[date] = None
    peticao_apos_publicacao: bool = False
    # Data do arquivamento definitivo achado no DataJud (Spec 001)
    encerrado_em: Optional[date] = None

class ProcessoCreate(ProcessoBase):
    # Só entra no sistema processo que o DataJud encontra, e para isso
    # precisa do número (Spec 001). Processos antigos sem CNJ continuam
    # aparecendo, por isso a resposta mantém o campo opcional
    cnj: CNJ
    cliente_id: int
    responsavel_id: Optional[int] = None
    escritorio_id: Optional[int] = None

class ProcessoUpdate(BaseModel):
    cnj: Optional[CNJ] = None
    titulo: Optional[str] = None
    tribunal: Optional[str] = None
    # Sem status: ele vem só do DataJud (Spec 001)
    tipo_processo: Optional[str] = None
    cliente_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    escritorio_id: Optional[int] = None


class ProcessoResponse(ProcessoBase):
    id: int
    data_cadastro: datetime
    cliente: ClienteResponse
    responsavel: Optional[UsuarioResponse] = None
    criador: UsuarioResponse
    prazos: List[PrazoResponse]
    prazo_estimado: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class ProcessoPrazoMovimentacaoResponse(BaseModel):
    processo_id: int
    tipo_processo: str
    prazo_dias: int
    data_cadastro: datetime
    data_limite: datetime
    dias_restantes: int
