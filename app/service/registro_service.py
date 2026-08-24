from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.models import Escritorio, Usuario
from app.schemas.registro import RegistroEscritorioRequest

PERFIL_ADMIN = "ADMIN"

"""
Onboarding de um escritório novo.

Este é o único ponto do sistema em que um usuário é criado sem que já exista
alguém autenticado — e ele só funciona para CNPJ ainda não cadastrado. A partir
do segundo usuário, o cadastro passa a ser responsabilidade do ADMIN do próprio
escritório, via POST /usuarios/.
"""

def registrar_escritorio(
        db: Session,
        dados: RegistroEscritorioRequest
) -> Usuario:

    if db.query(Escritorio).filter(Escritorio.cnpj == dados.cnpj).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um escritório cadastrado com este CNPJ. "
                   "Peça acesso ao administrador da conta."
        )

    if db.query(Usuario).filter(Usuario.email == dados.admin_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está em uso."
        )

    escritorio = Escritorio(
        nome_fantasia=dados.nome_fantasia,
        cnpj=dados.cnpj
    )
    db.add(escritorio)
    # O flush gera o id do escritório sem encerrar a transação, para que o
    # admin possa referenciá-lo. Se o commit falhar, os dois somem juntos.
    db.flush()

    admin = Usuario(
        nome=dados.admin_nome,
        email=dados.admin_email,
        senha=gerar_hash_senha(dados.admin_senha),
        oab=dados.admin_oab,
        perfil=PERFIL_ADMIN,
        escritorio_id=escritorio.id
    )
    db.add(admin)

    try:
        db.commit()
    except IntegrityError:
        # Cobre a corrida entre a verificação acima e o commit, caso duas
        # requisições cheguem com o mesmo CNPJ ou e-mail ao mesmo tempo
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CNPJ ou e-mail já cadastrado."
        )

    db.refresh(admin)
    return admin
