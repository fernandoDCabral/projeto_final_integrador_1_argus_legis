from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    oab: Optional[str] = None
    perfil: str

class UsuarioCreate(UsuarioBase):
    senha: str
    escritorio_id: Optional[int] = None

class UsuarioResponse(UsuarioBase):
    id: int
    escritorio_id: int
    model_config = ConfigDict(from_attributes=True)