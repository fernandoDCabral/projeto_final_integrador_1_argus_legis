from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class PrazoBase(BaseModel):
    descricao: str
    # Ausente/None = ainda não publicado no Diário Oficial (prazo interno).
    data_publicacao: Optional[date] = None
    finalizado: bool = False

class PrazoCreate(PrazoBase):
    processo_id: int

class PrazoResponse(PrazoBase):
    id: int
    processo_id: int
    data_vencimento: date
    # Derivado no service a partir da presença de data_publicacao — não é
    # aceito como input em PrazoCreate/PrazoUpdate.
    interno: bool
    model_config = ConfigDict(from_attributes=True)

class PrazoUpdate(BaseModel):
    descricao: Optional[str] = None
    data_publicacao: Optional[date] = None
    finalizado: Optional[bool] = None
    # data_vencimento não é aceito como input — é sempre derivado no service
    # a partir de data_publicacao/tipo_processo ou do prazo interno fixo
    # (ver prazo_service.atualizar_prazo). Aceitar aqui permitiria um PATCH
    # descolar o vencimento das regras de negócio.
