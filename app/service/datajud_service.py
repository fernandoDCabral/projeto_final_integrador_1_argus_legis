import json
import logging
import re
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.service import djen_service, prazo_service

logger = logging.getLogger("argus.datajud")

URL_BUSCA = "https://api-publica.datajud.cnj.jus.br/api_publica_{indice}/_search"
FUSO_HORARIO_LOCAL = ZoneInfo("America/Sao_Paulo")

TENTATIVAS = 3
# O TJCE já levou 23 s e o TJSP 31 s numa consulta simples (Spec 011)
TIMEOUT_SEGUNDOS = 35
# Quem espera é o usuário com o modal aberto: somando todas as tentativas, a
# consulta não passa deste tempo
TEMPO_MAXIMO_SEGUNDOS = 60
# Mesmo limite da coluna processos.titulo — acima disso o cadastro daria erro
TAMANHO_MAXIMO_TITULO = 100

# Código TR (Res. CNJ 65/2008) -> UF, usado pela Justiça Estadual (8) e Eleitoral (6)
UFS = [
    "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa",
    "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to",
]
JUSTICA_MILITAR_ESTADUAL = {13: "tjmmg", 21: "tjmrs", 26: "tjmsp"}

GRAUS = {
    "G1": "1º grau",
    "G2": "2º grau",
    "JE": "Juizado Especial",
    "TR": "Turma Recursal",
    "SUP": "Tribunal Superior",
}

# Movimentos da Tabela Processual Unificada do CNJ que marcam a publicação
CODIGO_PUBLICACAO = 92
CODIGO_DISPONIBILIZACAO_DJE = 1061
CODIGO_PETICAO = 85

# Movimentos que dizem se o processo acabou (Spec 001). O processo pode voltar
# depois do arquivamento, por exemplo para o cumprimento de sentença
CODIGO_ARQUIVAMENTO_DEFINITIVO = 246
CODIGO_REATIVACAO = 849
CODIGO_DESARQUIVAMENTO = 893
# No 2º grau o arquivamento só devolve o processo para a origem, que continua
GRAUS_DE_ORIGEM = ("G1", "JE")

PALAVRAS_CRIMINAIS =("penal", "criminal", "inquérito", "termo circunstanciado")
PALAVRAS_CIVEIS = ("cível", "civel")

def digito_verificador_valido(digitos: str) -> bool:
    """
    Os dígitos 8 e 9 do CNJ são um checksum módulo 97 (Res. CNJ 65/2008).

    Conferir antes de consultar pega erro de digitação: um CNJ com um dígito
    trocado é o número de outro processo, e a consulta traria dados de um
    estranho.
    """
    base = digitos[:7] + digitos[9:]
    return 98 - (int(base) * 100) % 97 == int(digitos[7:9])

def descobrir_indice(digitos: str) -> str:
    """Descobre o índice do DataJud a partir dos dígitos J (segmento) e TR (tribunal)."""
    j, tr = int(digitos[13]), int(digitos[14:16])

    if j == 3:
        return "stj"
    if j == 4 and 1 <= tr <= 6:
        return f"trf{tr}"
    if j == 5 and 0 <= tr <= 24:
        return "tst" if tr == 0 else f"trt{tr}"
    # A documentação do CNJ fala em tre-dft, mas o índice que responde é tre-df
    if j == 6 and 0 <= tr <= 27:
        return "tse" if tr == 0 else f"tre-{UFS[tr - 1]}"
    if j == 7:
        return "stm"
    if j == 8 and 1 <= tr <= 27:
        return "tjdft" if tr == 7 else f"tj{UFS[tr - 1]}"
    if j == 9 and tr in JUSTICA_MILITAR_ESTADUAL:
        return JUSTICA_MILITAR_ESTADUAL[tr]

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="A consulta pública do CNJ não cobre o tribunal deste número "
               "(o STF, por exemplo, não está disponível)."
    )

def _indisponivel() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="O DataJud está sobrecarregado agora. Tente de novo em alguns minutos."
    )

def _buscar_registros(indice: str, digitos: str) -> list[dict]:
    requisicao = urllib.request.Request(
        URL_BUSCA.format(indice=indice),
        data=json.dumps({"query": {"match": {"numeroProcesso": digitos}}}).encode(),
        headers={
            "Authorization": f"APIKey {settings.DATAJUD_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST"
    )

    inicio = time.monotonic()
    # Registros da última resposta parcial, usados se as tentativas acabarem
    registros_parciais = []

    for tentativa in range(1, TENTATIVAS + 1):
        try:
            with urllib.request.urlopen(requisicao, timeout=TIMEOUT_SEGUNDOS) as resposta:
                dados = json.load(resposta)
            registros = dados["hits"]["hits"]
        except urllib.error.HTTPError as erro:
            # 429 = API sobrecarregada; repetir depois de uma pausa costuma resolver
            if erro.code != 429:
                logger.warning("DataJud respondeu %s no índice %s", erro.code, indice)
                raise _indisponivel() from erro
            logger.warning("DataJud respondeu 429 no índice %s (tentativa %s)", indice, tentativa)
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as erro:
            # Timeout já custou 35 s, então não tenta de novo
            logger.warning("Falha ao consultar o DataJud no índice %s: %s", indice, erro)
            raise _indisponivel() from erro
        else:
            # Sobrecarregado, o DataJud responde 200 tendo consultado só parte
            # dos shards. Se o processo estava num shard que falhou, vem 0
            # registros, e isso não quer dizer que ele não existe (Spec 011)
            falhas = dados.get("_shards", {}).get("failed", 0)
            if falhas == 0:
                return registros
            logger.warning(
                "DataJud respondeu parcial no índice %s: %s shard(s) falharam, "
                "%s registro(s) (tentativa %s)", indice, falhas, len(registros), tentativa)
            registros_parciais = registros

        # Chegou aqui por 429 ou resposta parcial: tenta de novo depois de uma
        # pausa, mas só se a próxima tentativa inteira ainda couber no teto
        pausa = 2 * tentativa
        decorrido = time.monotonic() - inicio
        if tentativa == TENTATIVAS or decorrido + pausa + TIMEOUT_SEGUNDOS > TEMPO_MAXIMO_SEGUNDOS:
            break
        time.sleep(pausa)

    # Acabaram as tentativas. Registro que veio é íntegro, então usa. Sem
    # registro, o "não encontrado" não é confiável: é indisponibilidade, não 404
    if registros_parciais:
        logger.warning(
            "Usando %s registro(s) de resposta parcial do índice %s",
            len(registros_parciais), indice)
        return registros_parciais
    raise _indisponivel()

def _data_ajuizamento(valor: Optional[str]) -> Optional[date]:
    if not valor:
        return None
    try:
        # Costuma vir como 20230829000000, mas há tribunais que mandam ISO
        if valor.isdigit():
            return datetime.strptime(valor[:8], "%Y%m%d").date()
        return datetime.fromisoformat(valor).date()
    except ValueError:
        return None

def _instante(valor: Optional[str]) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(valor) if valor else None
    except ValueError:
        return None

def _movimentacao(movimento: dict) -> Optional[dict]:
    try:
        momento = datetime.fromisoformat(movimento["dataHora"])
    except (KeyError, TypeError, ValueError):
        return None
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=timezone.utc)

    # Movimentação sem horário chega como meia-noite UTC. Converter para
    # Brasília a jogaria para as 21h do dia anterior, então vira data pura
    if momento.time() == datetime.min.time():
        data, hora = momento.date(), None
    else:
        local = momento.astimezone(FUSO_HORARIO_LOCAL)
        data, hora = local.date(), local.strftime("%H:%M")

    nome = movimento.get("nome") or f"Movimento {movimento.get('codigo')}"
    complementos = [
        c["nome"] for c in movimento.get("complementosTabelados", []) if c.get("nome")
    ]
    if complementos:
        nome += f" ({', '.join(complementos)})"

    return {
        "momento": momento,
        "data": data,
        "hora": hora,
        "codigo": movimento.get("codigo"),
        "nome": nome,
    }

def _sugerir_titulo(classe: Optional[str], assuntos: list[str]) -> Optional[str]:
    partes = [p for p in (classe, assuntos[0] if assuntos else None) if p]
    if not partes:
        return None
    titulo = " — ".join(partes)
    if len(titulo) > TAMANHO_MAXIMO_TITULO:
        titulo = titulo[:TAMANHO_MAXIMO_TITULO - 1] + "…"
    return titulo

def _sugerir_tipo_processo(segmento: int, classe: Optional[str]) -> Optional[str]:
    """
    Só sugere quando a classe deixa claro. Na dúvida devolve None e o usuário
    escolhe: o tipo define a contagem do prazo, e um palpite errado conta
    errado sem ninguém perceber.
    """
    if segmento == 5:
        return "Trabalhista"

    classe_normalizada = (classe or "").lower()
    if any(p in classe_normalizada for p in PALAVRAS_CRIMINAIS):
        return "Criminal"
    if any(p in classe_normalizada for p in PALAVRAS_CIVEIS):
        return "Civil"
    return None

def consultar_processo(cnj: str, db: Session) -> dict:
    digitos = re.sub(r"\D", "", cnj)

    if len(digitos) != 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="O número CNJ deve ter 20 dígitos."
        )
    if not digito_verificador_valido(digitos):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Número CNJ inválido: o dígito verificador não confere. "
                   "Confira se nenhum dígito foi trocado."
        )

    indice = descobrir_indice(digitos)
    registros = _buscar_registros(indice, digitos)

    if not registros:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processo não encontrado no DataJud. Confira o número. "
                   "Processos recentes ou em segredo de justiça podem demorar "
                   "a aparecer."
        )

    # O mesmo processo pode vir duplicado; o registro atualizado mais recentemente é o que vale
    processo = max(
        registros, key=lambda r: r["_source"].get("dataHoraUltimaAtualizacao", "")
    )["_source"]

    classe = (processo.get("classe") or {}).get("nome")
    assuntos = [a["nome"] for a in processo.get("assuntos", []) if a.get("nome")]

    movimentacoes = [m for m in map(_movimentacao, processo.get("movimentos", [])) if m]
    movimentacoes.sort(key=lambda m: m["momento"], reverse=True)

    # Procura em todas as movimentações, não só nas que vão para a tela. A
    # publicação é o dia útil seguinte à disponibilização (CPC art. 224, §2º).
    # A lista vem da mais recente para a mais antiga, então toda petição vista
    # antes de achar a publicação foi protocolada depois dela
    data_publicacao = None
    data_disponibilizacao = None
    peticao_apos_publicacao = False
    for mov in movimentacoes:
        if mov["codigo"] == CODIGO_PETICAO:
            peticao_apos_publicacao = True
        if mov["codigo"] == CODIGO_DISPONIBILIZACAO_DJE:
            data_disponibilizacao = mov["data"]
            data_publicacao = prazo_service.proximo_dia_util(db, mov["data"])
            break

    # Tribunal que não registra a disponibilização: usa o movimento Publicação
    if data_publicacao is None:
        peticao_apos_publicacao = False
        for mov in movimentacoes:
            if mov["codigo"] == CODIGO_PETICAO:
                peticao_apos_publicacao = True
            if mov["codigo"] == CODIGO_PUBLICACAO:
                data_publicacao = mov["data"]
                break

    if data_publicacao is None:
        peticao_apos_publicacao = False

    fonte_publicacao = "DataJud" if data_publicacao else None
    tipo_publicacao = link_publicacao = hash_publicacao = None

    # O DJEN sai antes do DataJud, que recebe os dados com atraso. A
    # publicação dele vale se for igual ou mais recente; no empate fica o
    # DJEN porque traz tipo e link (Spec 010). Se o DJEN falhar, vem None e
    # segue só com o DataJud
    djen = djen_service.buscar_ultima_publicacao(digitos, db)
    if djen and (data_publicacao is None or djen["data_publicacao"] >= data_publicacao):
        data_publicacao = djen["data_publicacao"]
        data_disponibilizacao = djen["data_disponibilizacao"]
        fonte_publicacao = "DJEN"
        tipo_publicacao = djen["tipo"]
        link_publicacao = djen["link"]
        hash_publicacao = djen["hash"]
        # Indício de resposta: petição no DataJud depois da disponibilização
        peticao_apos_publicacao = any(
            mov["codigo"] == CODIGO_PETICAO and mov["data"] > data_disponibilizacao
            for mov in movimentacoes
        )

    # Encerrado = o último arquivamento definitivo é mais recente que a última
    # reativação ou desarquivamento. Olha todos os registros de 1º grau e
    # Juizado, não só o que vai para a tela. Empate (mesmo dia, sem horário)
    # fica como ativo: na dúvida, não esconde o processo
    ultimo_arquivamento = None
    ultima_reabertura = None
    for registro in registros:
        if registro["_source"].get("grau") not in GRAUS_DE_ORIGEM:
            continue
        for movimento in registro["_source"].get("movimentos", []):
            mov = _movimentacao(movimento)
            if not mov:
                continue
            if mov["codigo"] == CODIGO_ARQUIVAMENTO_DEFINITIVO:
                if ultimo_arquivamento is None or mov["momento"] > ultimo_arquivamento["momento"]:
                    ultimo_arquivamento = mov
            if mov["codigo"] in (CODIGO_REATIVACAO, CODIGO_DESARQUIVAMENTO):
                if ultima_reabertura is None or mov["momento"] > ultima_reabertura:
                    ultima_reabertura = mov["momento"]

    encerrado_em = None
    if ultimo_arquivamento and (
        ultima_reabertura is None or ultimo_arquivamento["momento"] > ultima_reabertura
    ):
        encerrado_em = ultimo_arquivamento["data"]

    return {
        "cnj": digitos,
        "tribunal": processo.get("tribunal") or indice.upper(),
        "grau": GRAUS.get(processo.get("grau"), processo.get("grau")),
        "orgao_julgador": (processo.get("orgaoJulgador") or {}).get("nome"),
        "classe": classe,
        "assuntos": assuntos,
        "data_ajuizamento": _data_ajuizamento(processo.get("dataAjuizamento")),
        "atualizado_em": _instante(processo.get("dataHoraUltimaAtualizacao")),
        "titulo_sugerido": _sugerir_titulo(classe, assuntos),
        "tipo_processo_sugerido": _sugerir_tipo_processo(int(digitos[13]), classe),
        # Histórico completo; a tela decide quantas mostrar
        "movimentacoes": movimentacoes,
        "data_publicacao": data_publicacao,
        "data_disponibilizacao": data_disponibilizacao,
        "fonte_publicacao": fonte_publicacao,
        "tipo_publicacao": tipo_publicacao,
        "link_publicacao": link_publicacao,
        "hash_publicacao": hash_publicacao,
        "peticao_apos_publicacao": peticao_apos_publicacao,
        "encerrado_em": encerrado_em,
    }
