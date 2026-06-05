from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import List
from app.core.config import settings
from app.database import get_db
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/")

def get_current_user(
        db: Session = Depends(get_db),
        token: str = Depends(oauth2_scheme)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas. Por favor, faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        # OBS: o campo "sub" armazena o ID do usuário
        # Assim como foi especificado na função "create_access_token" 
        # do módulo "auth.py"
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.id == user_id).first()

    if user is None:
        raise credentials_exception
    
    return user

class VerificadorPerfil:
    def __init__(self, perfis_permitidos: List[str]):
        self.perfis_permitidos = perfis_permitidos
    
    def __call__(
            self, 
            current_user: Usuario = Depends(get_current_user)
    ) -> Usuario:
        if current_user.perfil not in self.perfis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Você não possui autorização para esta ação"
            )
        
        return current_user 