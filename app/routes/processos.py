from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import re
from app import models, schemas, database

router = APIRouter(
    prefix="/processos",
    tags=["Processos"]
)

@router.post("/", response_model=schemas.ProcessoResponse)
def criar_processo(
    processo: schemas.ProcessoCreate,
    db: Session = Depends(database.get_db)
):
    novo_processo = models.Processo(**processo.model_dump())
    db.add(novo_processo)
    db.commit()
    db.refresh(novo_processo)
    return novo_processo

@router.get("/", response_model=List[schemas.ProcessoResponse])
def listar_processos(
    skip: int = 0,
    limit: int = 100,
    cnj: str | None = None,
    status: str | None = None,
    tribunal: str | None = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Processo)

    if cnj:
        cnj_limpo = re.sub(r"\D", "", cnj)
        query = query.filter(models.Processo.cnj.contains(cnj_limpo))
    if status:
        query = query.filter(models.Processo.status == status)
    if tribunal:
        query = query.filter(models.Processo.tribunal.icontains(tribunal))
    
    return query.order_by(
        models.Processo.id.desc()).offset(skip).limit(limit).all()

@router.get(
    "/{processo_id}/prazos", response_model=List[schemas.PrazoResponse]
)
def listar_prazos_por_processos(
    processo_id: int, 
    db: Session = Depends(database.get_db)
):
    return db.query(models.Prazo).filter(
        models.Prazo.processo_id == processo_id).all()
    