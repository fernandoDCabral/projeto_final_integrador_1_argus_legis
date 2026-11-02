from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import schemas, database
from app.core import security
from app.service import registro_service

router = APIRouter(
    prefix="/registro",
    tags=["Registro"]
)

@router.post(
    "/escritorio",
    response_model=schemas.RegistroEscritorioResponse,
    status_code=status.HTTP_201_CREATED
)
def registrar_escritorio(
    dados: schemas.RegistroEscritorioRequest,
    db: Session = Depends(database.get_db)
):
    admin = registro_service.registrar_escritorio(db, dados)

    # Já devolve o usuário autenticado: quem acabou de criar a conta não
    # precisa passar de novo pela tela de login
    access_token = security.criar_token_acesso(sub=str(admin.id))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Escritório cadastrado com sucesso!",
        "escritorio_id": admin.escritorio_id,
        "user": {
            "id": admin.id,
            "email": admin.email,
            "nome": admin.nome,
            "perfil": admin.perfil,
            "oab_numero": admin.oab_numero,
            "oab_uf": admin.oab_uf
        }
    }
