from __future__ import annotations
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .escritorio import Escritorio
    from .processo import Processo

class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True)
    senha: Mapped[str] = mapped_column(String(255))
    oab: Mapped[Optional[str]] = mapped_column(String(20))
    perfil: Mapped[str] = mapped_column(String(20))

    #Foreign key
    escritorio_id: Mapped[int] = mapped_column(ForeignKey("escritorios.id"))

    # Relações
    escritorio: Mapped["Escritorio"] = relationship(back_populates="usuarios")
    processos_criados: Mapped[list["Processo"]] = relationship(
        back_populates="criador", 
        foreign_keys="[Processo.criador_id]")
    processos_responsaveis: Mapped[list["Processo"]] = relationship(
        back_populates="responsavel",
        foreign_keys="[Processo.responsavel_id]"
    )