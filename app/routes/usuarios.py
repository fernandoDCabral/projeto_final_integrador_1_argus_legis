from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database
from app.api.deps import get_current_user, VerificadorPerfil
from app.core.security import gerar_hash_senha

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", response_model=schemas.UsuarioResponse)
def criar_usuario(
    usuario: schemas.UsuarioCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    
    dados = usuario.model_dump()
    dados["senha"] = gerar_hash_senha(dados.pop("senha"))
    novo_usuario = models.Usuario(**dados)
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.get("/", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(
    skip: int = 0,
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
): 
    usuarios = db.query(models.Usuario).order_by(
        models.Usuario.id.desc()).offset(skip).limit(limit).all()
    return usuarios

@router.delete("/{usuario_id}")
def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Operação não permitida: não é possível excluir a sua própria conta."
        )

    usuario_para_excluir = db.query(models.Usuario).filter(
        models.Usuario.id == usuario_id).first()
    if not usuario_para_excluir:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado para exclusão!"
        )
    
    db.delete(usuario_para_excluir)
    db.commit()
    
    return {"detail": f"Usuário {usuario_id} removido com sucesso!"}
    
