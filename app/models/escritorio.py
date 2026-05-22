from __future__ import annotations
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .usuario import Usuario
    from .cliente import Cliente
    from .processo import Processo

class Escritorio(Base):
    __tablename__ = "escritorios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_fantasia: Mapped[str] = mapped_column(String(100))
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)

    # Relações
    usuarios: Mapped[list["Usuario"]] = relationship(
        back_populates="escritorio",
        # Exclui todos os usuários de um determinado escritório,
        # caso ele seja excluído
        cascade="all, delete-orphan")
    
    clientes: Mapped[list["Cliente"]] = relationship(
        back_populates="escritorio",
        cascade="all, delete-orphan"
    )
    
    processos: Mapped[list["Processo"]] = relationship(
        back_populates="escritorio",
        cascade="all, delete-orphan") 