from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database
from app.api.deps import get_current_user
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
    current_user: models.Usuario = Depends(get_current_user)
):
    
    if current_user.perfil not in ["ADMIN", "GERAL"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil não autorizado a criar novos usuários."
        )
    
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
    db: Session = Depends(database.get_db)
): 
    usuarios = db.query(models.Usuario).order_by(
        models.Usuario.id.desc()).offset(skip).limit(limit).all()
    return usuarios
