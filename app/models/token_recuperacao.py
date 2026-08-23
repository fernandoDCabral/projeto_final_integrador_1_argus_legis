from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from ..database import Base

if TYPE_CHECKING:
    from .usuario import Usuario

class TokenRecuperacao(Base):
    """
    Token de uso único para redefinição de senha.

    O que fica gravado é o HASH do token, nunca ele em claro: se o banco
    vazar, os hashes não servem para tomar conta nenhuma — mesma lógica
    aplicada às senhas.
    """
    __tablename__ = "tokens_recuperacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expira_em: Mapped[datetime] = mapped_column(DateTime)
    usado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now())

    # Foreign key
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), index=True)

    # Relações
    usuario: Mapped["Usuario"] = relationship(
        back_populates="tokens_recuperacao")

    @property
    def esta_valido(self) -> bool:
        return self.usado_em is None and self.expira_em > datetime.now()
