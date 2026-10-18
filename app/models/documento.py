from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, LargeBinary, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from ..database import Base

if TYPE_CHECKING:
    from .processo import Processo
    from .usuario import Usuario

# Peça do processo (petição, contestação...) guardada no próprio banco (Spec 003)
class Documento(Base):
    __tablename__ = "documentos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(50))
    nome_arquivo: Mapped[str] = mapped_column(String(255))
    tamanho: Mapped[int] = mapped_column(Integer)
    paginas: Mapped[int] = mapped_column(Integer)
    # O PDF em si. deferred: só é lido do banco quando alguém baixa, assim a
    # listagem não carrega os arquivos
    conteudo: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    enviado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Foreign keys
    processo_id: Mapped[int] = mapped_column(ForeignKey("processos.id"))
    enviado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))

    # Relações
    processo: Mapped["Processo"] = relationship(back_populates="documentos")
    # Quem enviou a peça (Spec 005). Só ida: o Usuario não precisa da lista de peças
    enviado_por: Mapped["Usuario"] = relationship(foreign_keys=[enviado_por_id])

    # Nome de quem enviou, lido pelo DocumentoResponse. Mandamos só o nome,
    # não o usuário inteiro, para não expor e-mail e perfil (Spec 005)
    @property
    def enviado_por_nome(self) -> str:
        return self.enviado_por.nome
