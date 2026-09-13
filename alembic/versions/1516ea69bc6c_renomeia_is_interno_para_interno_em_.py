"""renomeia is_interno para interno em prazos

Revision ID: 1516ea69bc6c
Revises: 74113587b7c4
Create Date: 2026-09-13 01:13:22.418203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1516ea69bc6c'
down_revision: Union[str, Sequence[str], None] = '74113587b7c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Autogenerate detectou como add+drop, o que descartaria os valores já
    # gravados; usamos rename para preservar os dados existentes.
    op.alter_column('prazos', 'is_interno', new_column_name='interno')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('prazos', 'interno', new_column_name='is_interno')
