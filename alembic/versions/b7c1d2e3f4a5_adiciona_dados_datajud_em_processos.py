"""adiciona dados do datajud em processos

Revision ID: b7c1d2e3f4a5
Revises: 916e4e7e8494
Create Date: 2026-09-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = '916e4e7e8494'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('processos', sa.Column('classe', sa.String(length=255), nullable=True))
    op.add_column('processos', sa.Column('orgao_julgador', sa.String(length=255), nullable=True))
    op.add_column('processos', sa.Column('grau', sa.String(length=50), nullable=True))
    op.add_column('processos', sa.Column('data_ajuizamento', sa.Date(), nullable=True))
    op.add_column('processos', sa.Column('assuntos', sa.JSON(), nullable=True))
    op.add_column('processos', sa.Column('movimentacoes', sa.JSON(), nullable=True))
    op.add_column('processos', sa.Column('datajud_atualizado_em', sa.DateTime(timezone=True), nullable=True))
    op.add_column('processos', sa.Column('data_publicacao_datajud', sa.Date(), nullable=True))
    op.add_column('processos', sa.Column('prazo_estimado', sa.Date(), nullable=True))
    op.add_column('processos', sa.Column('peticao_apos_publicacao', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('processos', 'peticao_apos_publicacao')
    op.drop_column('processos', 'prazo_estimado')
    op.drop_column('processos', 'data_publicacao_datajud')
    op.drop_column('processos', 'datajud_atualizado_em')
    op.drop_column('processos', 'movimentacoes')
    op.drop_column('processos', 'assuntos')
    op.drop_column('processos', 'data_ajuizamento')
    op.drop_column('processos', 'grau')
    op.drop_column('processos', 'orgao_julgador')
    op.drop_column('processos', 'classe')
