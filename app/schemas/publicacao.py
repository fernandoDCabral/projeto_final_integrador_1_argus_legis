from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import List, Optional

# Comunicação do DJEN guardada para o processo (Spec 014)
class PublicacaoResponse(BaseModel):
    id: int
    data_disponibilizacao: date
    data_publicacao: date
    tipo: Optional[str] = None
    orgao: Optional[str] = None
    link: Optional[str] = None
    # OABs destinatárias, como ["56977/CE"]
    oabs: List[str]
    # A OAB do usuário logado está entre as destinatárias
    para_mim: bool
    model_config = ConfigDict(from_attributes=True)
