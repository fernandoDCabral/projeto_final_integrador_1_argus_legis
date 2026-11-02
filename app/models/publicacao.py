from __future__ import annotations
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from ..database import Base

if TYPE_CHECKING:
    from .processo import Processo

# Comunicação do DJEN guardada para o processo (Spec 014). O texto e os nomes
# das partes não vêm para cá (LGPD): o link leva ao documento
class Publicacao(Base):
    __tablename__ = "publicacoes"
    # A mesma comunicação não entra duas vezes no mesmo processo
    __table_args__ = (
        UniqueConstraint("processo_id", "hash", name="uq_publicacoes_processo_hash"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hash: Mapped[str] = mapped_column(String(100))
    data_disponibilizacao: Mapped[date] = mapped_column(Date)
    # Dia útil seguinte à disponibilização
    data_publicacao: Mapped[date] = mapped_column(Date)
    tipo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    orgao: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # OABs destinatárias, como ["56977/CE"]
    oabs: Mapped[list] = mapped_column(JSON)

    # Foreign key
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id", ondelete="CASCADE"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="publicacoes")
