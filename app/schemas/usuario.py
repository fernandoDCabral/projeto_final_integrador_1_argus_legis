from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from typing import Optional
from ..utils.validators import padroniza_oab

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    # OAB em duas partes, no formato do DJEN: "56977" e "CE" (Spec 014).
    # Opcional para todos os perfis
    oab_numero: Optional[str] = None
    oab_uf: Optional[str] = None
    perfil: str

class UsuarioCreate(UsuarioBase):
    senha: str
    escritorio_id: Optional[int] = None

    @model_validator(mode="after")
    def validar_oab(self):
        self.oab_numero, self.oab_uf = padroniza_oab(self.oab_numero, self.oab_uf)
        return self

class UsuarioResponse(UsuarioBase):
    id: int
    escritorio_id: int
    model_config = ConfigDict(from_attributes=True)
