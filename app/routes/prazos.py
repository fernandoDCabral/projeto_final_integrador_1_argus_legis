from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.utils.autorizacao import verificar_acesso_ao_processo
from app.api.deps import get_current_user, VerificadorPerfil
from app.service import prazo_service

router = APIRouter(
    prefix="/prazos",
    tags=["Prazos"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", response_model=schemas.PrazoResponse)
def criar_prazo(
    prazo: schemas.PrazoCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    verificar_acesso_ao_processo(prazo.processo_id, current_user.id, db)
    return prazo_service.criar_prazo(db, prazo)    

@router.patch("/{prazo_id}", response_model=schemas.PrazoResponse)
def atualizar_status(
    prazo_id: int, 
    dados_atualizados: schemas.PrazoUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    
    prazo_atual = db.query(models.Prazo).filter(
        models.Prazo.id == prazo_id).first()
    if not prazo_atual:
        raise HTTPException(status_code=404, detail="Prazo não encontrado!")
    
    verificar_acesso_ao_processo(prazo_atual.processo_id, current_user.id, db)

    return prazo_service.atualizar_prazo(db, prazo_atual, dados_atualizados)

@router.delete("/{prazo_id}")
def excluir_prazo(
    prazo_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    prazo_para_excluir = db.query(models.Prazo).filter(
        models.Prazo.id == prazo_id).first()
    if not prazo_para_excluir:
        raise HTTPException(status_code=404, 
                            detail="Prazo não encontrado para exclusão!")
    
    verificar_acesso_ao_processo(prazo_para_excluir.processo_id, current_user.id, db)

    db.delete(prazo_para_excluir)
    db.commit()
    return {"detail": f"Prazo {prazo_id} removido com sucesso!"}