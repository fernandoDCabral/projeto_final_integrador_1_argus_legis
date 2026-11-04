from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Boolean
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
    interno: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # "A conferir" (criado sozinho pelo DJEN), "Confirmado" ou "Descartado" (Spec 013)
    situacao: Mapped[str] = mapped_column(String(20), default="Confirmado", server_default="Confirmado")
    # Dias do prazo; nulo nos prazos antigos, que usam o padrão do tipo
    dias: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Quando foi marcado como cumprido (Spec 016); nulo nos que já estavam finalizados
    concluido_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="prazos")