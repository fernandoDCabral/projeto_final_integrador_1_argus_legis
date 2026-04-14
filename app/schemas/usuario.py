from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from .escritorio import EscritorioResponse

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    oab: Optional[str] = None
    perfil: str

class UsuarioCreate(UsuarioBase):
    senha: str
    escritorio_id: int

class UsuarioResponse(UsuarioBase):
    id: int
    escritorio_id: int
    model_config = ConfigDict(from_attributes=True)