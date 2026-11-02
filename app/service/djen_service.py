import json
import logging
import time
import urllib.error
import urllib.request
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Processo, Publicacao
from app.service import prazo_service

logger = logging.getLogger("argus.djen")

# API pública do DJEN (CNJ), sem chave. Não tem documentação oficial, então
# pode mudar sem aviso: qualquer falha aqui só faz a consulta seguir com o
# DataJud (Spec 010)
URL_DJEN = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"
TIMEOUT_SEGUNDOS = 10
# Distribuição só avisa que o processo chegou ao órgão, não abre prazo. A API
# mistura maiúsculas e minúsculas, então a comparação é em minúsculas
TIPOS_IGNORADOS = ("distribuição",)
# Na 21ª chamada seguida a API dá 429 com Retry-After: 4
ESPERA_MAXIMA_429 = 5
# Mesmos limites das colunas em processos e publicacoes
TAMANHO_MAXIMO_TIPO = 100
TAMANHO_MAXIMO_LINK = 500
TAMANHO_MAXIMO_ORGAO = 255

class DjenIndisponivel(Exception):
    """A API do DJEN falhou. Diferente de None, que é "não tem publicação" (Spec 013)"""

def buscar_publicacoes(digitos: str, db: Session) -> list[dict]:
    """
    Todas as comunicações ativas do processo no DJEN (Spec 014), já no
    formato da tabela publicacoes: {hash, data_disponibilizacao,
    data_publicacao, tipo, orgao, link, oabs}. Se a API falhar, levanta
    DjenIndisponivel (Spec 013). O texto da comunicação não sai daqui: tem
    dado pessoal das partes (LGPD) e o link já leva ao documento.
    """
    url = f"{URL_DJEN}?numeroProcesso={digitos}"

    dados = None
    for tentativa in (1, 2):
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT_SEGUNDOS) as resposta:
                dados = json.load(resposta)
            break
        except urllib.error.HTTPError as erro:
            # 429: espera e tenta só mais uma vez. O Retry-After do DJEN não é
            # confiável (vem 0, negativo ou curto demais); espera sempre o máximo
            if erro.code == 429 and tentativa == 1:
                logger.warning("DJEN respondeu 429; tentando de novo em %s s", ESPERA_MAXIMA_429)
                time.sleep(ESPERA_MAXIMA_429)
                continue
            logger.warning("DJEN respondeu %s para o processo %s", erro.code, digitos)
            raise DjenIndisponivel()
        except (urllib.error.URLError, TimeoutError, ValueError) as erro:
            logger.warning("Falha ao consultar o DJEN para o processo %s: %s", digitos, erro)
            raise DjenIndisponivel()

    publicacoes = []
    try:
        for item in dados["items"]:
            if not item["ativo"]:
                continue
            disponibilizacao = date.fromisoformat(item["data_disponibilizacao"])

            link = item.get("link")
            if link and len(link) > TAMANHO_MAXIMO_LINK:
                # Link cortado não abre; melhor não mostrar
                link = None

            # A mesma comunicação vem repetida, uma por parte intimada, cada
            # uma com as OABs dela. Advogado sem número ou UF fica de fora
            oabs = []
            for destinatario in item.get("destinatarioadvogados") or []:
                advogado = destinatario.get("advogado") or {}
                numero = advogado.get("numero_oab")
                uf = advogado.get("uf_oab")
                if numero and uf:
                    oabs.append(f"{int(numero)}/{uf}")

            publicacoes.append({
                "hash": item["hash"],
                "data_disponibilizacao": disponibilizacao,
                # Publicação = dia útil seguinte à disponibilização (Lei
                # 11.419/2006, art. 4º, §3º; CPC art. 224, §2º), a mesma regra
                # do movimento 1061
                "data_publicacao": prazo_service.proximo_dia_util(db, disponibilizacao),
                "tipo": (item.get("tipoDocumento") or "")[:TAMANHO_MAXIMO_TIPO] or None,
                "orgao": (item.get("nomeOrgao") or "")[:TAMANHO_MAXIMO_ORGAO] or None,
                "link": link,
                "oabs": oabs,
            })
    except (KeyError, TypeError, ValueError) as erro:
        logger.warning("Resposta inesperada do DJEN para o processo %s: %s", digitos, erro)
        raise DjenIndisponivel()

    return publicacoes

def buscar_ultima_publicacao(digitos: str, db: Session,
                             publicacoes: Optional[list[dict]] = None) -> Optional[dict]:
    """
    Última comunicação do processo no DJEN que conta como publicação, de
    qualquer destinatário. Devolve {data_disponibilizacao, data_publicacao,
    tipo, link, hash} ou None se não houver. Quem já tem a lista de
    buscar_publicacoes passa ela, para não chamar o DJEN de novo (Spec 014).
    """
    if publicacoes is None:
        publicacoes = buscar_publicacoes(digitos, db)

    # Distribuição não abre prazo
    validas = [
        p for p in publicacoes
        if (p["tipo"] or "").lower() not in TIPOS_IGNORADOS
    ]
    if not validas:
        return None
    ultima = max(validas, key=lambda p: p["data_disponibilizacao"])

    return {
        "data_disponibilizacao": ultima["data_disponibilizacao"],
        "data_publicacao": ultima["data_publicacao"],
        "tipo": ultima["tipo"],
        "link": ultima["link"],
        "hash": ultima["hash"],
    }

def gravar_publicacoes(db: Session, processo: Processo, publicacoes: list[dict]):
    """
    Guarda no processo as comunicações que ele ainda não tem, pelo hash
    (Spec 014). Nada é apagado. Não faz commit; quem chama grava junto.
    """
    hashes_guardados = {p.hash for p in processo.publicacoes}
    for dados in publicacoes:
        if dados["hash"] in hashes_guardados:
            continue
        processo.publicacoes.append(Publicacao(**dados))
        hashes_guardados.add(dados["hash"])
