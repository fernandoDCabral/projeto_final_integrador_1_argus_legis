from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from app import schemas, database
from app.schemas.auth import LoginRequest
from app.models.usuario import Usuario
from app.core import security
from app.service import recuperacao_service
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/", response_model=schemas.LoginResponse)
def login(
    data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(database.get_db)
):
    user = db.query(Usuario).filter(Usuario.email == data.username).first()

    if not user or not security.verificar_senha(data.password, user.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )
    
    # Gera JWT apenas para usuários legítimos
    access_token = security.criar_token_acesso(sub=str(user.id))
    
    return{
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login realizado com sucesso!",
        "user": {
            "id": user.id,
            "email": user.email,
            "nome": user.nome,
            "perfil": user.perfil
        }
    }

@router.post("/esqueci-senha", response_model=schemas.MensagemResponse)
def esqueci_senha(
    dados: schemas.EsqueciSenhaRequest,
    db: Session = Depends(database.get_db)
):
    recuperacao_service.solicitar_recuperacao(db, dados.email)

    # Resposta deliberadamente idêntica exista ou não o e-mail: qualquer
    # diferença aqui transformaria a rota num verificador de contas
    return {
        "message": "Se este e-mail estiver cadastrado, enviamos um link "
                   "para redefinir a senha."
    }

@router.get(
    "/redefinir-senha/{token}",
    response_model=schemas.TokenValidoResponse
)
def validar_token_recuperacao(
    token: str,
    db: Session = Depends(database.get_db)
):
    """
    Confere o link antes de mostrar o formulário, para o usuário não digitar
    a senha nova duas vezes e só então descobrir que o link expirou.
    """
    usuario = recuperacao_service.verificar_token(db, token)
    return {"valido": True, "nome": usuario.nome, "email": usuario.email}

@router.post("/redefinir-senha", response_model=schemas.MensagemResponse)
def redefinir_senha(
    dados: schemas.RedefinirSenhaRequest,
    db: Session = Depends(database.get_db)
):
    recuperacao_service.redefinir_senha(db, dados.token, dados.nova_senha)
    return {"message": "Senha redefinida com sucesso! Faça login para continuar."}