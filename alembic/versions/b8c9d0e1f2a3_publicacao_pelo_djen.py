"""publicação pelo DJEN

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # A data deixa de vir só do DataJud (Spec 010). Renomear mantém os dados
    op.alter_column('processos', 'data_publicacao_datajud', new_column_name='data_publicacao')
    op.add_column('processos', sa.Column('data_disponibilizacao', sa.Date(), nullable=True))
    op.add_column('processos', sa.Column('fonte_publicacao', sa.String(length=20), nullable=True))
    op.add_column('processos', sa.Column('tipo_publicacao', sa.String(length=100), nullable=True))
    op.add_column('processos', sa.Column('link_publicacao', sa.String(length=500), nullable=True))
    op.add_column('processos', sa.Column('hash_publicacao', sa.String(length=100), nullable=True))
    # Toda data gravada até aqui veio do DataJud. A disponibilização fica nula
    # até o próximo "Atualizar DataJud"
    op.execute(
        "UPDATE processos SET fonte_publicacao = 'DataJud' WHERE data_publicacao IS NOT NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('processos', 'hash_publicacao')
    op.drop_column('processos', 'link_publicacao')
    op.drop_column('processos', 'tipo_publicacao')
    op.drop_column('processos', 'fonte_publicacao')
    op.drop_column('processos', 'data_disponibilizacao')
    op.alter_column('processos', 'data_publicacao', new_column_name='data_publicacao_datajud')
