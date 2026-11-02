"""atualizar todos pelo DJEN

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-11-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Quando o Argus consultou o DJEN pela última vez (Spec 012), para pular
    # quem foi atualizado há menos de 1 hora
    op.add_column('processos', sa.Column('djen_consultado_em', sa.DateTime(timezone=True), nullable=True))
    # "A conferir", "Confirmado" ou "Descartado". Os prazos que já existem
    # foram cadastrados pelo advogado, então nascem "Confirmado"
    op.add_column('prazos', sa.Column('situacao', sa.String(length=20), nullable=False, server_default='Confirmado'))
    # Quantidade de dias do prazo; nulo nos antigos (vale o padrão do tipo)
    op.add_column('prazos', sa.Column('dias', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('prazos', 'dias')
    op.drop_column('prazos', 'situacao')
    op.drop_column('processos', 'djen_consultado_em')
