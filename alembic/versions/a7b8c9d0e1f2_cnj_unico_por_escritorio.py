"""cnj único por escritório

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O CNJ deixa de ser único no sistema todo e passa a ser único dentro de
    # cada escritório (Spec 008). O índice continua, sem ser único, porque a
    # busca da listagem filtra por CNJ
    op.drop_index('ix_processos_cnj', table_name='processos')
    op.create_index('ix_processos_cnj', 'processos', ['cnj'], unique=False)
    op.create_unique_constraint('uq_processos_escritorio_cnj', 'processos', ['escritorio_id', 'cnj'])


def downgrade() -> None:
    """Downgrade schema."""
    # Só funciona se nenhum CNJ estiver repetido entre escritórios. Se
    # estiver, o índice único não é criado e o downgrade falha
    op.drop_constraint('uq_processos_escritorio_cnj', 'processos', type_='unique')
    op.drop_index('ix_processos_cnj', table_name='processos')
    op.create_index('ix_processos_cnj', 'processos', ['cnj'], unique=True)
