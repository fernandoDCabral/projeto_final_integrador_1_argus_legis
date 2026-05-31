from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.utils.autorizacao import verificar_acesso_ao_processo
from app.api.deps import get_current_user

router = APIRouter(
    prefix="/prazos",
    tags=["Prazos"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", response_model=schemas.PrazoResponse)
def criar_prazo(
    prazo: schemas.PrazoCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    verificar_acesso_ao_processo(prazo.processo_id, current_user.id, db)

    novo_prazo = models.Prazo(**prazo.model_dump())
    db.add(novo_prazo)
    db.commit()
    db.refresh(novo_prazo)
    return novo_prazo

@router.patch("/{prazo_id}", response_model=schemas.PrazoResponse)
def atualizar_status(
    prazo_id: int, 
    dados_atualizados: schemas.PrazoUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    
    prazo_atual = db.query(models.Prazo).filter(
        models.Prazo.id == prazo_id).first()
    if not prazo_atual:
        raise HTTPException(status_code=404, detail="Prazo não encontrado!")
    
    verificar_acesso_ao_processo(prazo_atual.processo_id, current_user.id, db)

    dados_dict = dados_atualizados.model_dump(exclude_unset=True)
    for chave, valor in dados_dict.items():
        setattr(prazo_atual, chave, valor)
    
    db.commit()
    db.refresh(prazo_atual)
    return prazo_atual

@router.delete("/{prazo_id}")
def excluir_prazo(
    prazo_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
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