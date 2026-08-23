import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_pura, senha_hash)

def gerar_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def gerar_token_recuperacao() -> str:
    """
    Token aleatório para o link de redefinição de senha.
    `secrets` usa a fonte criptográfica do sistema — `random` não serve aqui,
    porque a sequência dele é previsível a partir de saídas anteriores.
    """
    return secrets.token_urlsafe(32)

def gerar_hash_token(token: str) -> str:
    """
    SHA-256 (e não bcrypt) de propósito: o token já é aleatório e longo, então
    não precisa de proteção contra força bruta, e o hash rápido e determinístico
    permite procurar o registro por índice em vez de varrer a tabela inteira.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
    
# Método de criação de JWT (JSON Web Token)
def criar_token_acesso(
        sub: Union[str, Any], 
        expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(sub)}

    enconded_jwt = jwt.encode(to_encode, 
                                settings.SECRET_KEY, 
                                algorithm=settings.ALGORITHM)
    return enconded_jwt

