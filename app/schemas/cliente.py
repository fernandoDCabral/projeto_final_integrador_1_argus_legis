from pydantic import BaseModel, ConfigDict, EmailStr, AfterValidator
from typing import Annotated
import re
from ..utils.validators import padroniza_cnpj, padroniza_cpf

CNPJ = Annotated[str, AfterValidator(padroniza_cnpj)]
CPF = Annotated[str, AfterValidator(padroniza_cpf)]

class ClienteBase(BaseModel):
    nome: str
    tipo_pessoa: str
    cpf: CPF | None = None
    cnpj: CNPJ | None = None
    email: EmailStr
    telefone: str
    endereco: str
    escritorio_id: int

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
