from __future__ import annotations
from datetime import date
from sqlalchemy import String, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class Feriado(Base):
    __tablename__ = "feriados"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[date] = mapped_column(Date, unique=True, index=True)
    descricao: Mapped[str] = mapped_column(String(100))
    # Informativo apenas: nacional, estadual, municipal, ponto_facultativo,
    # recesso_forense. Não influencia o cálculo de dias úteis.
    tipo: Mapped[str] = mapped_column(String(20))
