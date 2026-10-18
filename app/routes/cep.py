from fastapi import APIRouter, Depends
from app import schemas
from app.api.deps import get_current_user
from app.service import cep_service

# Exige login: sem isso a rota viraria um proxy aberto para o ViaCEP
router = APIRouter(
    prefix="/cep",
    tags=["CEP"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/{cep}", response_model=schemas.ConsultaCepResponse)
def consultar_cep(cep: str):
    """
    Busca o endereço de um CEP para pré-preencher o cadastro do cliente (Spec 006).
    """
    return cep_service.consultar_cep(cep)
