from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from ..database import Base

if TYPE_CHECKING:
    from .escritorio import Escritorio
    from .cliente import Cliente
    from .usuario import Usuario
    from .prazo import Prazo
    from .documento import Documento

class Processo(Base):
    __tablename__ = "processos"
    # O CNJ é único dentro de cada escritório, não no sistema todo (Spec 008)
    __table_args__ = (
        UniqueConstraint("escritorio_id", "cnj", name="uq_processos_escritorio_cnj"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cnj: Mapped[Optional[str]] = mapped_column(String(30), index=True, nullable=True)
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
    # Última publicação no Diário (DJEN ou DataJud, Spec 010) e o vencimento
    # calculado a partir dela. É só estimativa: o advogado confirma ao assumir
    data_publicacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # Dia em que saiu no diário; a publicação é o dia útil seguinte
    data_disponibilizacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # "DJEN" ou "DataJud". Tipo, link e hash só vêm quando a fonte é o DJEN
    fonte_publicacao: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tipo_publicacao: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    link_publicacao: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Com o hash a tela monta o link da certidão de publicação no CNJ
    hash_publicacao: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    prazo_estimado: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    peticao_apos_publicacao: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # Última vez que o Argus consultou o DJEN deste processo (Spec 013)
    djen_consultado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Data do arquivamento definitivo no DataJud. Preenchida = processo encerrado
    encerrado_em: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

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
    # Apagar o processo apaga as peças junto (Spec 003)
    documentos: Mapped[list["Documento"]] = relationship(
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