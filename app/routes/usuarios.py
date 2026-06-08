from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app import models, schemas, database
from app.api.deps import get_current_user, VerificadorPerfil
from app.core.security import gerar_hash_senha

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
    dependencies=[Depends(get_current_user)]
)

@router.post(
        "/", 
        response_model=schemas.UsuarioResponse, 
        status_code=status.HTTP_201_CREATED
)
def criar_usuario(
    usuario: schemas.UsuarioCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    # Verifica se o e-mail já esta cadastrado no sistema
    if db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já cadastrado."
        ) 
     
    dados = usuario.model_dump()
    dados["senha"] = gerar_hash_senha(dados.pop("senha"))
    dados["escritorio_id"] = current_user.escritorio_id
    
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
    # Trava de exclusão para evitar que um usuário exclua a própria conta
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
    
    processo_vinculados = db.query(models.Processo).filter(
        or_(
            models.Processo.criador_id == usuario_id,
            models.Processo.responsavel_id == usuario_id
        )
    ).first()
    if processo_vinculados:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir este usuário, " \
            "pois ele possui processos vinculados ao seu perfil"
        )
    
    db.delete(usuario_para_excluir)
    db.commit()
    
    return {"detail": f"Usuário {usuario_id} removido com sucesso!"}
    
