from pydantic import BaseModel, ConfigDict, AfterValidator
from ..utils.validators import padroniza_cnpj
from typing import Annotated

CNPJ = Annotated[str, AfterValidator(padroniza_cnpj)]

class EscritorioBase(BaseModel):
    nome_fantasia: str
    cnpj: CNPJ

class EscritorioCreate(EscritorioBase):
    pass

class EscritorioResponse(EscritorioBase):
    id: int
    model_config = ConfigDict(from_attributes=True)