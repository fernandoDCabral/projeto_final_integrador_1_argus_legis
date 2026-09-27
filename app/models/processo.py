from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from ..database import Base

if TYPE_CHECKING:
    from .escritorio import Escritorio
    from .cliente import Cliente
    from .usuario import Usuario
    from .prazo import Prazo

class Processo(Base):
    __tablename__ = "processos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cnj: Mapped[Optional[str]] = mapped_column(String(30), unique=True, index=True, nullable=True)
    titulo: Mapped[str] = mapped_column(String(100))
    tribunal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, server_default="TJCE")
    status: Mapped[str] = mapped_column(String(20))
    data_cadastro: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    tipo_processo: Mapped[str] = mapped_column(String(50), nullable=False)

    # Dados da consulta ao DataJud, guardados para o advogado ver antes de assumir
    classe: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    orgao_julgador: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    grau: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    data_ajuizamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    assuntos: Mapped[Optional[list]] = mapped_column(JSON(none_as_null=True), nullable=True)
    movimentacoes: Mapped[Optional[list]] = mapped_column(JSON(none_as_null=True), nullable=True)
    datajud_atualizado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Última publicação no Diário achada no DataJud e o vencimento calculado a
    # partir dela. É só estimativa: o advogado confirma a data ao assumir
    data_publicacao_datajud: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    prazo_estimado: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    peticao_apos_publicacao: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    #Foreign keys
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    responsavel_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True)
    criador_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    escritorio_id: Mapped[int] = mapped_column(ForeignKey("escritorios.id"))

    # Relações
    cliente: Mapped["Cliente"] = relationship(back_populates="processos")
    prazos: Mapped[list["Prazo"]] = relationship(
        back_populates="processo", 
        cascade="all, delete-orphan"
    )
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