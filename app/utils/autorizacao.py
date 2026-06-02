from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app import models

"""
Módulo utilitário para verificar a autorização de acesso a um processo.
OBS: Será necessário refatorar esta função, pois ela está ferindo o príncipio
de responsabilidade única, mas por hora ela está aqui para evitar duplicação de
código. Checar o Icebox, issue 'refactor(auth)', para mais detalhes.        
"""
def verificar_acesso_ao_processo(
        processo_id: int, 
        usuario_id: int, 
        db: Session
) -> None:
    
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Processo vinculado não encontrado."
        )

    if processo.responsavel_id is None:
        return 
        
    if processo.responsavel_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o responsável tem permissão para esta ação."
        )
        