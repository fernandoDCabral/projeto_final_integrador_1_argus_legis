from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Escritorio(Base):
    __tablename__ = "escritorios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_fantasia: Mapped[str] = mapped_column(String(100))
    cnpj: Mapped[str] = mapped_column(String(20), unique=True)

    # Relações
    usuarios: Mapped[List["Usuario"]] = relationship(back_populates="escritorio")

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

class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    tipo_pessoa: Mapped[str] = mapped_column(String(20))
    cpf: Mapped[Optional[str]] = mapped_column(String(14))
    cnpj: Mapped[Optional[str]] = mapped_column(String(18))
    email: Mapped[str] = mapped_column(String(100))
    telefone: Mapped[str] = mapped_column(String(20))
    endereco: Mapped[str] = mapped_column(String(255))

    # Relações
    processos: Mapped[List["Processo"]] = relationship(back_populates="cliente")

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

    # Relações
    cliente: Mapped["Cliente"] = relationship(back_populates="processos")
    prazos: Mapped[List["Prazo"]] = relationship(back_populates="processo")
    responsavel: Mapped["Usuario"] = relationship("Usuario", 
                                                  foreign_keys=[responsavel_id])
    criador: Mapped["Usuario"] = relationship("Usuario", 
                                              foreign_keys=[criador_id])

class Prazo(Base):
    __tablename__ = "prazos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    descricao: Mapped[str] = mapped_column(String(255))
    data_publicacao: Mapped[datetime] = mapped_column(DateTime)
    data_vencimento: Mapped[datetime] = mapped_column(DateTime)
    finalizado: Mapped[bool] = mapped_column(Boolean, default=False)

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="prazos")

