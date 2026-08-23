from pydantic import BaseModel, ConfigDict, EmailStr, AfterValidator, model_validator
from typing import Annotated, Optional
from enum import Enum
from ..utils.validators import padroniza_cnpj, padroniza_cpf

CNPJ = Annotated[str, AfterValidator(padroniza_cnpj)]
CPF = Annotated[str, AfterValidator(padroniza_cpf)]

class TipoPessoa(str, Enum):
    FISICA = "FISICA"
    JURIDICA = "JURIDICA"

class ClienteBase(BaseModel):
    nome: str
    tipo_pessoa: TipoPessoa
    cpf: CPF | None = None
    cnpj: CNPJ | None = None
    email: EmailStr
    telefone: str
    endereco: str

    @model_validator(mode="after")
    def validar_documento(self):
        """
        Amarra o documento ao tipo de pessoa. Sem isso é possível cadastrar
        pessoa física com CNPJ, com os dois documentos, ou sem nenhum.
        """
        if self.tipo_pessoa == TipoPessoa.FISICA:
            if not self.cpf:
                raise ValueError("Informe o CPF para cliente pessoa física.")
            if self.cnpj:
                raise ValueError("Cliente pessoa física não deve ter CNPJ.")
        else:
            if not self.cnpj:
                raise ValueError("Informe o CNPJ para cliente pessoa jurídica.")
            if self.cpf:
                raise ValueError("Cliente pessoa jurídica não deve ter CPF.")
        return self

class ClienteCreate(ClienteBase):
    # O escritório vem sempre do usuário autenticado, nunca do corpo da
    # requisição — caso contrário dá para pendurar cliente em escritório alheio
    pass

class ClienteUpdate(BaseModel):
    # Documento e tipo de pessoa ficam de fora de propósito: mudar isso não é
    # editar o cliente, é trocá-lo por outro
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None

class ClienteResponse(BaseModel):
    """
    A leitura é intencionalmente mais permissiva que a escrita (str em vez de
    enum/EmailStr), para que registros gravados antes destas regras continuem
    podendo ser listados em vez de derrubar o endpoint.
    """
    id: int
    nome: str
    tipo_pessoa: str
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    email: str
    telefone: str
    endereco: str
    escritorio_id: int
    model_config = ConfigDict(from_attributes=True)
