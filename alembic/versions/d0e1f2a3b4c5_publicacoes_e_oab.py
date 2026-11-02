"""publicacoes do DJEN e OAB em numero e UF

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-11-02 14:00:00.000000

"""
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0e1f2a3b4c5'
down_revision: Union[str, Sequence[str], None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Cópia da lista de app/utils/validators.py: a migration não importa o app,
# para continuar rodando igual mesmo que o app mude
UFS = (
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
)


def upgrade() -> None:
    """Upgrade schema."""
    # Todas as comunicações do DJEN de cada processo (Spec 014)
    op.create_table(
        'publicacoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hash', sa.String(length=100), nullable=False),
        sa.Column('data_disponibilizacao', sa.Date(), nullable=False),
        sa.Column('data_publicacao', sa.Date(), nullable=False),
        sa.Column('tipo', sa.String(length=100), nullable=True),
        sa.Column('orgao', sa.String(length=255), nullable=True),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('oabs', sa.JSON(), nullable=False),
        sa.Column('processo_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['processo_id'], ['processos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('processo_id', 'hash', name='uq_publicacoes_processo_hash'),
    )

    # OAB em duas colunas, no formato do DJEN
    op.add_column('usuarios', sa.Column('oab_numero', sa.String(length=20), nullable=True))
    op.add_column('usuarios', sa.Column('oab_uf', sa.String(length=2), nullable=True))

    # Converte o texto livre: "123456/CE" e "CE12345" viram número e UF.
    # Se faltar um dos dois (ex.: "CE00000"), os dois ficam nulos
    conexao = op.get_bind()
    usuarios = conexao.execute(sa.text("select id, oab from usuarios where oab is not null")).fetchall()
    for id_usuario, oab in usuarios:
        digitos = re.sub(r"\D", "", oab)
        letras = re.sub(r"[^A-Za-z]", "", oab).upper()
        numero = digitos.lstrip("0") or None
        uf = letras if letras in UFS else None
        if numero and uf:
            conexao.execute(
                sa.text("update usuarios set oab_numero = :numero, oab_uf = :uf where id = :id"),
                {"numero": numero, "uf": uf, "id": id_usuario},
            )

    op.drop_column('usuarios', 'oab')


def downgrade() -> None:
    """Downgrade schema."""
    # Volta a OAB como "numero/UF"
    op.add_column('usuarios', sa.Column('oab', sa.String(length=20), nullable=True))
    op.execute(
        "update usuarios set oab = oab_numero || '/' || oab_uf "
        "where oab_numero is not null and oab_uf is not null"
    )
    op.drop_column('usuarios', 'oab_uf')
    op.drop_column('usuarios', 'oab_numero')
    op.drop_table('publicacoes')
