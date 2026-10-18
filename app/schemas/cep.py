from pydantic import BaseModel

# Resposta do GET /cep/{cep} (Spec 006). Campo que o ViaCEP manda vazio vem ""
class ConsultaCepResponse(BaseModel):
    cep: str
    logradouro: str
    bairro: str
    cidade: str
    uf: str
