from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.api.deps import get_current_user

"""
A criação de escritório vive em POST /registro/escritorio, porque ela cria o
escritório e o seu primeiro ADMIN na mesma transação — um escritório sem
administrador é inacessível e não deveria poder existir.

O que sobra aqui é consulta, e sempre restrita ao escritório do usuário logado.
"""

router = APIRouter(
    prefix="/escritorios",
    tags=["Escritorios"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/me", response_model=schemas.EscritorioResponse)
def buscar_meu_escritorio(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    escritorio = db.query(models.Escritorio).filter(
        models.Escritorio.id == current_user.escritorio_id).first()
    if not escritorio:
        raise HTTPException(status_code=404, detail="Escritório não encontrado!")
    return escritorio

@router.get("/{escritorio_id}", response_model=schemas.EscritorioResponse)
def listar_escritorios_por_id(
    escritorio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if escritorio_id != current_user.escritorio_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a dados de outro escritório."
        )

    dados_escritorio = db.query(models.Escritorio).filter(
        models.Escritorio.id == escritorio_id).first()
    if not dados_escritorio:
        raise HTTPException(
            status_code=404, detail="Escritório não encontrado!")
    return dados_escritorio
