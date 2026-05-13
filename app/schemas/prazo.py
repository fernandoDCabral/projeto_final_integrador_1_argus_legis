from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class PrazoBase(BaseModel):
    descricao: str
    data_publicacao: datetime
    finalizado: bool = False

class PrazoCreate(PrazoBase):
    processo_id: int

class PrazoResponse(PrazoBase):
    id: int
    processo_id: int
    data_vencimento: datetime
    model_config = ConfigDict(from_attributes=True)

class PrazoUpdate(BaseModel):
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime] = None
    finalizado: Optional[bool] = None
