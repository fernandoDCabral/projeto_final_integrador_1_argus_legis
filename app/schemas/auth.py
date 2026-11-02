from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginUserResponse(BaseModel):
    id: int
    email: str
    nome: str
    perfil: str
    # A tela usa a OAB no filtro "Só as minhas" da aba DJEN (Spec 014)
    oab_numero: Optional[str] = None
    oab_uf: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    message: str
    user: LoginUserResponse
    model_config = ConfigDict(from_attributes=True)
