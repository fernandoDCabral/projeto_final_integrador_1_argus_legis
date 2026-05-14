from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from app import schemas, database
from app.schemas.auth import LoginRequest
from app.models.usuario import Usuario
from app.core import security
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
            "email": user.email
        }
    }