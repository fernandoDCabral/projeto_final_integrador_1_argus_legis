from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import schemas, database
from app.api.deps import get_current_user
from app.service import datajud_service

# Exige login: sem isso a rota viraria um proxy aberto para a API do CNJ,
# consumindo a cota da chave em nome do servidor
router = APIRouter(
    prefix="/datajud",
    tags=["DataJud"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/{cnj}", response_model=schemas.ConsultaDatajudResponse)
def consultar_processo(cnj: str, db: Session = Depends(database.get_db)):
    """
    Busca um processo na API pública do DataJud pelo número CNJ.

    Serve para pré-preencher o cadastro. Não serve para contar prazo: o CNJ
    recebe os dados dos tribunais com atraso, às vezes de semanas.
    """
    return datajud_service.consultar_processo(cnj, db)
