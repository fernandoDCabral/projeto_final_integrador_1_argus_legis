from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .escritorio import Escritorio
    from .cliente import Cliente
    from .usuario import Usuario
    from .prazo import Prazo

class Processo(Base):
    __tablename__ = "processos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, 
                                    autoincrement=True)
    cnj: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    titulo: Mapped[str] = mapped_column(String(100))
    tribunal: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    data_cadastro: Mapped[datetime] = mapped_column(DateTime, 
                                                    server_default=func.now())

    #Foreign keys
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    responsavel_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    criador_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    escritorio_id: Mapped[int] = mapped_column(ForeignKey("escritorios.id"))

    # Relações
    cliente: Mapped["Cliente"] = relationship(back_populates="processos")
    prazos: Mapped[list["Prazo"]] = relationship(back_populates="processo")
    responsavel: Mapped["Usuario"] = relationship(
        "Usuario", 
        foreign_keys=[responsavel_id],
        back_populates="processos_responsaveis"
    )
    criador: Mapped["Usuario"] = relationship(
        "Usuario", 
        foreign_keys=[criador_id],
        back_populates="processos_criados"
    )
    escritorio: Mapped["Escritorio"] = relationship(
        back_populates="processos")