from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database

router = APIRouter(
    prefix="/escritorios",
    tags=["Escritorios"]
)

@router.post("/", response_model=schemas.EscritorioResponse)
def criar_escritorio(
    escritorio: schemas.EscritorioCreate, 
    db: Session = Depends(database.get_db)
):
    novo_escritorio = models.Escritorio(**escritorio.model_dump())
    db.add(novo_escritorio)
    db.commit()
    db.refresh(novo_escritorio)
    return novo_escritorio

@router.get("/{escritorio_id}", response_model=schemas.EscritorioResponse)
def listar_escritorios_por_id(
    escritorio_id: int, 
    db: Session = Depends(database.get_db)
):
    dados_escritorio = db.query(models.Escritorio).filter(
        models.Escritorio.id == escritorio_id).first()
    if not dados_escritorio:
        raise HTTPException(
            status_code=404, detail="Escritório não encontrado!")
    return dados_escritorio