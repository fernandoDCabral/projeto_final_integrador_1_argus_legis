from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app import models

# Utilitário para busca de processos e verificação 
# de autorização do usuário sobre ele
def verificar_acesso_ao_processo(
        processo_id: int, 
        usuario_id: int, 
        db: Session
) -> models.Processo:
    
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Processo vinculado não encontrado."
        )
        
    if processo.responsavel_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o responsável tem permissão para esta ação."
        )
        
    return processo