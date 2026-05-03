from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app import models, schemas, database
from app.schemas.auth import LoginResponse, LoginRequest
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

#Invés de salvar a senha pura, eu atribuo uma hash no banco para aquela senha
senha = CryptContext(schemes=["bcrypt"], deprecated = "auto")

def verificar_senha(senha_pura, hash_senha):
    return senha.verify(senha_pura, hash_senha)

@router.post("/", response_model=schemas.LoginResponse)
def login(data: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(Usuario).filter(Usuario.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Não foi encontrado email cadastrado para esse usuário")
    
    if not verificar_senha(data.password, user.senha):
        print(data.password)
        print(user.senha)
        raise HTTPException(status_code=401, detail= "Senha incorreta")
    
    return{
        "message" : "Login realizado com sucesso!",
        "user" : {
            "id" : user.id,
            "email" : user.email
        }
    }