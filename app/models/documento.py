from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, LargeBinary, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .processo import Processo

# Peça do processo (petição, contestação...) guardada no próprio banco (Spec 003)
class Documento(Base):
    __tablename__ = "documentos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(50))
    nome_arquivo: Mapped[str] = mapped_column(String(255))
    tamanho: Mapped[int] = mapped_column(Integer)
    paginas: Mapped[int] = mapped_column(Integer)
    # O PDF em si. deferred: só é lido do banco quando alguém baixa, assim a
    # listagem não carrega os arquivos
    conteudo: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    enviado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))
    enviado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="documentos")
