from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import LoginBase

router = APIRouter(
    prefix="/auth",
    tags=["Autentificação"]
)

@router.post("/login")
async def login(credentials: LoginBase):
    if credentials.email == "admin@argus.com" and credentials.senha == "123456":
        return {
            "access_token": "token-temporario-de-teste",
            "token_type": "bearer",
            "usuario": {
                "nome": "Victor",
                "email": credentials.email
            }
        }
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="E-mail ou senha incorretos"
    )