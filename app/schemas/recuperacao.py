from pydantic import BaseModel, EmailStr, Field

class EsqueciSenhaRequest(BaseModel):
    email: EmailStr

class MensagemResponse(BaseModel):
    message: str

class TokenValidoResponse(BaseModel):
    valido: bool
    nome: str
    email: EmailStr

class RedefinirSenhaRequest(BaseModel):
    token: str = Field(min_length=10)
    # O limite de 72 vem do bcrypt, que ignora tudo o que passa disso
    nova_senha: str = Field(min_length=8, max_length=72)
