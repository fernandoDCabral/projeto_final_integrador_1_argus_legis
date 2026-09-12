from __future__ import annotations
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from ..database import Base

if TYPE_CHECKING:
    from .processo import Processo

class Prazo(Base):
    __tablename__ = "prazos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    descricao: Mapped[str] = mapped_column(String(255))
    # NULL até a publicação oficial no Diário — antes disso o vencimento é
    # calculado a partir de um prazo interno fixo (ver prazo_service).
    data_publicacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_vencimento: Mapped[date] = mapped_column(Date)
    finalizado: Mapped[bool] = mapped_column(Boolean, default=False)
    is_interno: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="prazos")