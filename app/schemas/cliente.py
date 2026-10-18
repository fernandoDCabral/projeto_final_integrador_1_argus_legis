from pydantic import BaseModel, ConfigDict, EmailStr, AfterValidator, Field, model_validator
from typing import Annotated, Optional
from enum import Enum
from ..utils.validators import padroniza_cnpj, padroniza_cpf, validate_and_clean_numeric_string

CNPJ = Annotated[str, AfterValidator(padroniza_cnpj)]
CPF = Annotated[str, AfterValidator(padroniza_cpf)]

def padroniza_cep(value: str) -> str:
    # Aceita "60160-230" ou "60160230" e guarda só os 8 dígitos (Spec 006)
    return validate_and_clean_numeric_string(value, 8, "CEP")

def padroniza_uf(value: str) -> str:
    # UF com 2 letras, guardada em maiúscula: "ce" vira "CE"
    value = value.strip().upper()
    if len(value) != 2 or not value.isalpha():
        raise ValueError("UF deve ter 2 letras")
    return value

CEP = Annotated[str, AfterValidator(padroniza_cep)]
UF = Annotated[str, AfterValidator(padroniza_uf)]

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
    # Endereço (Spec 006): só o complemento é opcional
    cep: CEP
    logradouro: str = Field(max_length=255)
    numero: str = Field(max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: str = Field(max_length=100)
    cidade: str = Field(max_length=100)
    uf: UF

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
    cep: Optional[CEP] = None
    logradouro: Optional[str] = Field(default=None, max_length=255)
    numero: Optional[str] = Field(default=None, max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: Optional[str] = Field(default=None, max_length=100)
    cidade: Optional[str] = Field(default=None, max_length=100)
    uf: Optional[UF] = None

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
    # Opcionais: cliente antigo só tem logradouro (Spec 006)
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    escritorio_id: int
    model_config = ConfigDict(from_attributes=True)
