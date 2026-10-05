"""adiciona tabela de documentos

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Peças do processo em PDF, guardadas no próprio banco (Spec 003)
    op.create_table(
        'documentos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(length=50), nullable=False),
        sa.Column('nome_arquivo', sa.String(length=255), nullable=False),
        sa.Column('tamanho', sa.Integer(), nullable=False),
        sa.Column('paginas', sa.Integer(), nullable=False),
        sa.Column('conteudo', sa.LargeBinary(), nullable=False),
        sa.Column('enviado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processo_id', sa.Integer(), nullable=False),
        sa.Column('enviado_por_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['processo_id'], ['processos.id']),
        sa.ForeignKeyConstraint(['enviado_por_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_documentos_processo_id', 'documentos', ['processo_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_documentos_processo_id', table_name='documentos')
    op.drop_table('documentos')
