from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class PrazoBase(BaseModel):
    descricao: str
    finalizado: bool = False

class PrazoCreate(PrazoBase):
    # Prazo só nasce de uma publicação no Diário (Spec 002)
    data_publicacao: date
    processo_id: int

class PrazoResponse(PrazoBase):
    id: int
    processo_id: int
    # Só os prazos internos antigos (Prazo Inicial, antes da Spec 002) não têm
    data_publicacao: Optional[date] = None
    data_vencimento: date
    # True só nos Prazos Iniciais antigos; prazo novo sempre nasce False
    interno: bool
    model_config = ConfigDict(from_attributes=True)

class PrazoUpdate(BaseModel):
    descricao: Optional[str] = None
    data_publicacao: Optional[date] = None
    finalizado: Optional[bool] = None
    # data_vencimento não é aceito como input — é sempre derivado no service
    # a partir de data_publicacao/tipo_processo (ver prazo_service.atualizar_prazo).
    # Aceitar aqui permitiria um PATCH descolar o vencimento das regras de negócio.
