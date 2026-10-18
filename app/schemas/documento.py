from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Lista de peças do processo: tudo menos o conteúdo, que tem rota própria (Spec 003)
class DocumentoResponse(BaseModel):
    id: int
    processo_id: int
    tipo: str
    nome_arquivo: str
    tamanho: int
    paginas: int
    enviado_por_id: int
    # Vem da property enviado_por_nome do model Documento (Spec 005)
    enviado_por_nome: str
    enviado_em: datetime
    model_config = ConfigDict(from_attributes=True)
