"""finaliza prazos internos sem publicação

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-03 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O "Prazo Inicial" contava da data de cadastro, sem nenhuma publicação
    # por trás (Spec 002). Finaliza em vez de apagar para não perder o histórico
    op.execute(
        "UPDATE prazos SET finalizado = true "
        "WHERE interno = true AND data_publicacao IS NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Antes desta migration todos esses prazos estavam em aberto
    op.execute(
        "UPDATE prazos SET finalizado = false "
        "WHERE interno = true AND data_publicacao IS NULL"
    )
