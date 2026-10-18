"""separa endereço de clientes em campos

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-18 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Endereço em campos separados (Spec 006). Tudo nullable porque os
    # clientes antigos não têm esses dados
    op.add_column('clientes', sa.Column('cep', sa.String(length=8), nullable=True))
    op.add_column('clientes', sa.Column('logradouro', sa.String(length=255), nullable=True))
    op.add_column('clientes', sa.Column('numero', sa.String(length=20), nullable=True))
    op.add_column('clientes', sa.Column('complemento', sa.String(length=100), nullable=True))
    op.add_column('clientes', sa.Column('bairro', sa.String(length=100), nullable=True))
    op.add_column('clientes', sa.Column('cidade', sa.String(length=100), nullable=True))
    op.add_column('clientes', sa.Column('uf', sa.String(length=2), nullable=True))

    # Texto livre não dá para separar com segurança: vai inteiro para a rua,
    # assim nada se perde
    op.execute("UPDATE clientes SET logradouro = endereco")
    op.drop_column('clientes', 'endereco')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('clientes', sa.Column('endereco', sa.String(length=255), nullable=True))

    # Junta os campos que tiverem valor, no formato
    # "Rua X, 12, apto 1 - Bairro, Cidade/UF - CEP 60160230".
    # concat_ws pula os NULL, e NULLIF transforma texto vazio em NULL.
    # Cliente antigo (só logradouro) volta exatamente com o texto de antes
    op.execute("""
        UPDATE clientes SET endereco = LEFT(concat_ws(' - ',
            NULLIF(concat_ws(', ', NULLIF(logradouro, ''), NULLIF(numero, ''), NULLIF(complemento, '')), ''),
            NULLIF(concat_ws(', ', NULLIF(bairro, ''),
                NULLIF(concat_ws('/', NULLIF(cidade, ''), NULLIF(uf, '')), '')), ''),
            'CEP ' || NULLIF(cep, '')
        ), 255)
    """)
    # Antes desta migration a coluna era obrigatória
    op.execute("UPDATE clientes SET endereco = '' WHERE endereco IS NULL")
    op.alter_column('clientes', 'endereco', nullable=False)

    op.drop_column('clientes', 'uf')
    op.drop_column('clientes', 'cidade')
    op.drop_column('clientes', 'bairro')
    op.drop_column('clientes', 'complemento')
    op.drop_column('clientes', 'numero')
    op.drop_column('clientes', 'logradouro')
    op.drop_column('clientes', 'cep')
