from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .processo import Processo

class Prazo(Base):
    __tablename__ = "prazos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    descricao: Mapped[str] = mapped_column(String(255))
    data_publicacao: Mapped[datetime] = mapped_column(DateTime)
    data_vencimento: Mapped[datetime] = mapped_column(DateTime)
    finalizado: Mapped[bool] = mapped_column(Boolean, default=False)

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="prazos")