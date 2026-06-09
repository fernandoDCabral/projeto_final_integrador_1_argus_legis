from pydantic import BaseModel, ConfigDict, AfterValidator
from typing import Optional
from datetime import datetime
from typing import List, Annotated
from .usuario import UsuarioResponse
from .cliente import ClienteResponse
from .prazo import PrazoResponse
from ..utils.validators import padroniza_cnj

CNJ = Annotated[str, AfterValidator(padroniza_cnj)]

class ProcessoBase(BaseModel):
    cnj: CNJ
    titulo: str
    tribunal: str
    status: str = "Ativo"
    tipo_processo: str

class ProcessoCreate(ProcessoBase):
    cliente_id: int
    responsavel_id: Optional[int] = None
    escritorio_id: Optional[int] = None

class ProcessoUpdate(BaseModel):
    cnj: Optional[CNJ] = None
    titulo: Optional[str] = None
    tribunal: Optional[str] = None
    status: Optional[str] = None
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
    model_config = ConfigDict(from_attributes=True)

class ProcessoPrazoMovimentacaoResponse(BaseModel):
    processo_id: int
    tipo_processo: str
    prazo_dias: int
    data_cadastro: datetime
    data_limite: datetime
    dias_restantes: int
