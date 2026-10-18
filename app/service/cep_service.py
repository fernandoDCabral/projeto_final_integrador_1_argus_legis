import json
import logging
import re
import urllib.error
import urllib.request

from fastapi import HTTPException, status

logger = logging.getLogger("argus.cep")

# ViaCEP: gratuito e sem chave (Spec 006). Trocar de fornecedor muda só este arquivo
URL_VIACEP = "https://viacep.com.br/ws/{cep}/json/"
# Quem espera é o usuário digitando o cadastro. Se demorar, ele preenche à mão
TIMEOUT_SEGUNDOS = 5


def consultar_cep(cep: str) -> dict:
    """
    Busca rua, bairro, cidade e UF de um CEP no ViaCEP.

    Serve só para pré-preencher o cadastro do cliente: todos os campos
    continuam editáveis, e se a consulta falhar o usuário preenche à mão.
    """
    # "60160-230" e "60160230" dão o mesmo resultado
    digitos = re.sub(r"\D", "", cep)
    if len(digitos) != 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O CEP deve ter 8 dígitos."
        )

    try:
        with urllib.request.urlopen(URL_VIACEP.format(cep=digitos), timeout=TIMEOUT_SEGUNDOS) as resposta:
            dados = json.load(resposta)
    except (urllib.error.URLError, TimeoutError, ValueError) as erro:
        # URLError também cobre HTTPError (ViaCEP respondendo 4xx/5xx)
        logger.warning("Falha ao consultar o ViaCEP para o CEP %s: %s", digitos, erro)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível consultar o CEP agora. Preencha o endereço à mão."
        ) from erro

    # CEP com formato certo mas que não existe: o ViaCEP responde {"erro": true}
    if dados.get("erro"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CEP não encontrado. Preencha o endereço à mão."
        )

    # O complemento do ViaCEP fica de fora: ele descreve a rua ("lado ímpar"),
    # não o endereço do cliente. CEP geral de cidade pequena vem sem rua e
    # bairro, e esses campos voltam ""
    return {
        "cep": digitos,
        "logradouro": dados.get("logradouro") or "",
        "bairro": dados.get("bairro") or "",
        "cidade": dados.get("localidade") or "",
        "uf": dados.get("uf") or "",
    }
