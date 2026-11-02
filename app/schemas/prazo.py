from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from typing import Optional, Literal

class PrazoBase(BaseModel):
    descricao: str
    finalizado: bool = False

class PrazoCreate(PrazoBase):
    # Prazo só nasce de uma publicação no Diário (Spec 002)
    data_publicacao: date
    processo_id: int

class PrazoResponse(PrazoBase):
    id: int
    processo_id: int
    # Só os prazos internos antigos (Prazo Inicial, antes da Spec 002) não têm
    data_publicacao: Optional[date] = None
    data_vencimento: date
    # True só nos Prazos Iniciais antigos; prazo novo sempre nasce False
    interno: bool
    # "A conferir", "Confirmado" ou "Descartado" (Spec 012)
    situacao: str
    # Nulo nos prazos antigos: a tela mostra o padrão do tipo
    dias: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class PrazoUpdate(BaseModel):
    descricao: Optional[str] = None
    data_publicacao: Optional[date] = None
    finalizado: Optional[bool] = None
    # Confirmar tira a etiqueta; descartar também finaliza (Spec 012).
    # "A conferir" só o sistema cria, então não é aceito aqui
    situacao: Optional[Literal["Confirmado", "Descartado"]] = None
    # Trocar os dias recalcula o vencimento a partir da publicação
    dias: Optional[int] = Field(default=None, ge=1, le=365)
    # data_vencimento não é aceito como input — é sempre derivado no service
    # a partir de data_publicacao/tipo_processo (ver prazo_service.atualizar_prazo).
    # Aceitar aqui permitiria um PATCH descolar o vencimento das regras de negócio.
