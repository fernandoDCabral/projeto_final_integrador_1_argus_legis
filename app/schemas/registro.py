from pydantic import BaseModel, ConfigDict, EmailStr, Field, AfterValidator
from typing import Annotated, Optional
from ..utils.validators import padroniza_cnpj
from .auth import LoginUserResponse

CNPJ = Annotated[str, AfterValidator(padroniza_cnpj)]

class RegistroEscritorioRequest(BaseModel):
    # Dados do escritório
    nome_fantasia: str = Field(min_length=2, max_length=100)
    cnpj: CNPJ

    # Dados do primeiro ADMIN (o sócio que está criando a conta)
    admin_nome: str = Field(min_length=2, max_length=100)
    admin_email: EmailStr
    # O limite de 72 vem do bcrypt, que ignora tudo o que passa disso
    admin_senha: str = Field(min_length=8, max_length=72)
    admin_oab: Optional[str] = Field(default=None, max_length=20)

class RegistroEscritorioResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    message: str
    escritorio_id: int
    user: LoginUserResponse
    model_config = ConfigDict(from_attributes=True)
