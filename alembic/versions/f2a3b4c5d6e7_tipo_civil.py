"""tipo civil

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-11-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O tipo é "Civil". Alguns processos foram gravados como "Cível" e o
    # cálculo do prazo não acha esse tipo: passam para "Civil"
    op.execute("UPDATE processos SET tipo_processo = 'Civil' WHERE tipo_processo = 'Cível'")


def downgrade() -> None:
    """Downgrade schema."""
    # Não dá para saber quais eram "Cível" antes: fica como está
    pass
