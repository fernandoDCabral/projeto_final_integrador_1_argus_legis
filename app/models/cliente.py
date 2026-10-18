from __future__ import annotations
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .escritorio import Escritorio
    from .processo import Processo

class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    tipo_pessoa: Mapped[str] = mapped_column(String(20))
    cpf: Mapped[Optional[str]] = mapped_column(String(11))
    cnpj: Mapped[Optional[str]] = mapped_column(String(14))
    email: Mapped[str] = mapped_column(String(100))
    telefone: Mapped[str] = mapped_column(String(20))
    # Endereço em campos separados (Spec 006). Tudo nullable por causa dos
    # clientes antigos, que só têm o texto livre copiado para logradouro
    cep: Mapped[Optional[str]] = mapped_column(String(8))
    logradouro: Mapped[Optional[str]] = mapped_column(String(255))
    numero: Mapped[Optional[str]] = mapped_column(String(20))
    complemento: Mapped[Optional[str]] = mapped_column(String(100))
    bairro: Mapped[Optional[str]] = mapped_column(String(100))
    cidade: Mapped[Optional[str]] = mapped_column(String(100))
    uf: Mapped[Optional[str]] = mapped_column(String(2))

    # Foreign key
    escritorio_id: Mapped[int] = mapped_column(ForeignKey("escritorios.id"))

    # Relações
    escritorio: Mapped["Escritorio"] = relationship(back_populates="clientes")
    processos: Mapped[list["Processo"]] = relationship(back_populates="cliente")