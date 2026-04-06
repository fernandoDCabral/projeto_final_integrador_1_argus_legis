from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional, List

#Schema Cliente
class ClienteBase(BaseModel):
    nome: str
    tipo_pessoa: str
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    email: EmailStr
    telefone: str
    endereco: str

class ClienteCreate(ClienteBase):
    pass


class ClienteResponse(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Schema Processo
class ProcessoBase(BaseModel):
    cnj: str
    titulo: str
    tribunal: str
    status: str = "Ativo"

class ProcessoCreate(ProcessoBase):
    cliente_id: int
    responsavel_id: int
    criador_id: int

class ProcessoResponse(ProcessoBase):
    id: int
    data_cadastro: datetime
    cliente_id: int
    model_config = ConfigDict(from_attributes=True)

# Schema Escritorio
class EscritorioBase(BaseModel):
    nome_fantasia: str
    cnpj: str

class EscritorioCreate(EscritorioBase):
    pass

class EscritorioResponse(EscritorioBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Schema Usuario
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

# Schema Prazo
class PrazoBase(BaseModel):
    descricao: str
    data_publicacao: datetime
    data_vencimento: datetime
    finalizado: bool = False

class PrazoCreate(PrazoBase):
    processo_id: int

class PrazoResponse(PrazoBase):
    id: int
    processo_id: int
    model_config = ConfigDict(from_attributes=True)

class PrazoUpdate(BaseModel):
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime] = None
    finalizado: Optional[bool] = None
