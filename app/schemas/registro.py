from pydantic import BaseModel, ConfigDict, EmailStr, Field, AfterValidator, model_validator
from typing import Annotated, Optional
from ..utils.validators import padroniza_cnpj, padroniza_oab
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
    # OAB em duas partes, opcional (Spec 014)
    admin_oab_numero: Optional[str] = None
    admin_oab_uf: Optional[str] = None

    @model_validator(mode="after")
    def validar_oab(self):
        self.admin_oab_numero, self.admin_oab_uf = padroniza_oab(
            self.admin_oab_numero, self.admin_oab_uf)
        return self

class RegistroEscritorioResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    message: str
    escritorio_id: int
    user: LoginUserResponse
    model_config = ConfigDict(from_attributes=True)
