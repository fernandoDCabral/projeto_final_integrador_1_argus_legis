from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Processo, Prazo, Feriado
from app.schemas import PrazoCreate, PrazoUpdate

PRAZOS_POR_TIPO = {
    "civil": 15,
    "criminal": 10,
    "trabalhista": 8,
    "administrativo": 30,
}

def buscar_prazo_por_tipo(tipo_processo: str):
    dias = PRAZOS_POR_TIPO.get(tipo_processo.lower())

    if dias is None:
        raise HTTPException(
            status_code=400,
            detail="Tipo de processo inválido"
        )

    return dias

# Janela de busca de feriados a partir da publicação: folga generosa o
# bastante para cobrir qualquer prazo de PRAZOS_POR_TIPO mesmo atravessando
# o recesso forense inteiro (20/dez-20/jan) mais de uma vez.
_HORIZONTE_BUSCA_FERIADOS_DIAS = 400

def _feriados_no_periodo(db: Session, inicio: date, fim: date) -> set[date]:
    feriados = db.query(Feriado.data).filter(
        Feriado.data >= inicio, Feriado.data <= fim
    ).all()

    return {data for (data,) in feriados}

def _verificar_dia_util(data: date, feriados: set[date]) -> bool:
    return data.weekday() < 5 and data not in feriados

def _proximo_dia_util(data: date, feriados: set[date]) -> date:
    proxima = data + timedelta(days=1)

    while not _verificar_dia_util(proxima, feriados):
        proxima += timedelta(days=1)

    return proxima

def _contar_dias_uteis(db: Session, data_inicio: date, dias: int) -> date:
    """Conta `dias` dias úteis a partir de `data_inicio` (art. 224 CPC: o dia
    inicial não conta; a contagem começa no primeiro dia útil seguinte). Fins
    de semana, feriados, pontos facultativos e o recesso forense (tabela
    `feriados`) são pulados.
    """
    horizonte = data_inicio + timedelta(days=_HORIZONTE_BUSCA_FERIADOS_DIAS)
    feriados = _feriados_no_periodo(db, data_inicio, horizonte)

    data_atual = data_inicio
    for _ in range(dias):
        data_atual = _proximo_dia_util(data_atual, feriados)

    return data_atual

def _contar_dias_corridos(db: Session, data_inicio: date, dias: int) -> date:
    """Prazo penal (CPP art. 798): conta sábado, domingo e feriado, mas não o
    dia do começo. O recesso de 20/dez a 20/jan suspende a contagem (art.
    798-A) e, se o último dia não for útil, vence no próximo dia útil (§3º).
    """
    horizonte = data_inicio + timedelta(days=_HORIZONTE_BUSCA_FERIADOS_DIAS)
    feriados = _feriados_no_periodo(db, data_inicio, horizonte)
    recesso = {
        data for (data,) in db.query(Feriado.data).filter(
            Feriado.data >= data_inicio,
            Feriado.data <= horizonte,
            Feriado.tipo == "recesso_forense"
        ).all()
    }

    data_atual = data_inicio
    contados = 0
    while contados < dias:
        data_atual += timedelta(days=1)
        if data_atual not in recesso:
            contados += 1

    if not _verificar_dia_util(data_atual, feriados):
        data_atual = _proximo_dia_util(data_atual, feriados)

    return data_atual

def proximo_dia_util(db: Session, data: date) -> date:
    return _contar_dias_uteis(db, data, 1)

def calcular_data_vencimento(db: Session, data_publicacao: date, tipo_processo: str) -> date:
    dias = buscar_prazo_por_tipo(tipo_processo)
    if tipo_processo.lower() == "criminal":
        return _contar_dias_corridos(db, data_publicacao, dias)
    return _contar_dias_uteis(db, data_publicacao, dias)

def criar_prazo(db: Session, prazo_data: PrazoCreate):
    processo = db.query(Processo).filter(
        Processo.id == prazo_data.processo_id).first()

    if not processo:
        raise HTTPException(
            status_code=404,
            detail="Processo não encontrado!"
        )

    # Prazo só nasce de uma publicação (Spec 002); o schema já exige a data
    data_vencimento = calcular_data_vencimento(
        db=db,
        data_publicacao=prazo_data.data_publicacao,
        tipo_processo=processo.tipo_processo
    )

    novo_prazo = Prazo(
        descricao=prazo_data.descricao,
        data_publicacao=prazo_data.data_publicacao,
        data_vencimento=data_vencimento,
        finalizado=prazo_data.finalizado,
        interno=False,
        processo_id=prazo_data.processo_id
    )

    db.add(novo_prazo)
    db.commit()
    db.refresh(novo_prazo)

    return novo_prazo

def atualizar_prazo(db: Session, prazo: Prazo, dados_atualizados: PrazoUpdate):
    dados_dict = dados_atualizados.model_dump(exclude_unset=True)

    # Trocar a data da publicação recalcula o vencimento. Apagar a data não
    # pode: sem publicação não há de onde contar (Spec 002)
    if "data_publicacao" in dados_dict:
        if dados_dict["data_publicacao"] is None:
            raise HTTPException(
                status_code=400,
                detail="O prazo precisa da data da publicação."
            )

        processo = db.query(Processo).filter(
            Processo.id == prazo.processo_id).first()

        if not processo:
            raise HTTPException(
                status_code=404,
                detail="Processo não encontrado!"
            )

        dados_dict["data_vencimento"] = calcular_data_vencimento(
            db=db,
            data_publicacao=dados_dict["data_publicacao"],
            tipo_processo=processo.tipo_processo
        )
        dados_dict["interno"] = False

    for chave, valor in dados_dict.items():
        setattr(prazo, chave, valor)

    db.commit()
    db.refresh(prazo)

    return prazo
