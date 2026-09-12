from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Processo, Prazo
from app.schemas import PrazoCreate, PrazoUpdate

PRAZOS_POR_TIPO = {
    "civil": 15,
    "criminal": 10,
    "trabalhista": 8,
    "administrativo": 30,
}

# Prazo interno fixo (não varia por tipo_processo) para o advogado redigir a
# petição inicial antes de haver publicação oficial no Diário.
PRAZO_PETICAO_INICIAL_DIAS = 10

def buscar_prazo_por_tipo(tipo_processo: str):
    dias = PRAZOS_POR_TIPO.get(tipo_processo.lower())

    if dias is None:
        raise HTTPException(
            status_code=400,
            detail="Tipo de processo inválido"
        )

    return dias

def calcular_data_vencimento(data_publicacao, tipo_processo: str):
    dias = buscar_prazo_por_tipo(tipo_processo)

    return data_publicacao + timedelta(days=dias)

def calcular_data_vencimento_interno(processo: Processo):
    return processo.data_cadastro.date() + timedelta(days=PRAZO_PETICAO_INICIAL_DIAS)

def calcular_prazo_movimentacao(processo: Processo):
    prazo_dias = buscar_prazo_por_tipo(processo.tipo_processo)
    data_limite = processo.data_cadastro + timedelta(days=prazo_dias)
    agora = datetime.now(processo.data_cadastro.tzinfo)
    dias_restantes = (data_limite.date() - agora.date()).days

    return {
        "processo_id": processo.id,
        "tipo_processo": processo.tipo_processo,
        "prazo_dias": prazo_dias,
        "data_cadastro": processo.data_cadastro,
        "data_limite": data_limite,
        "dias_restantes": dias_restantes,
    }

def criar_prazo(db: Session, prazo_data: PrazoCreate):
    processo = db.query(Processo).filter(
        Processo.id == prazo_data.processo_id).first()

    if not processo:
        raise HTTPException(
            status_code=404,
            detail="Processo não encontrado!"
        )

    if prazo_data.data_publicacao is not None:
        data_vencimento = calcular_data_vencimento(
            data_publicacao=prazo_data.data_publicacao,
            tipo_processo=processo.tipo_processo
        )
        is_interno = False
    else:
        data_vencimento = calcular_data_vencimento_interno(processo)
        is_interno = True

    novo_prazo = Prazo(
        descricao=prazo_data.descricao,
        data_publicacao=prazo_data.data_publicacao,
        data_vencimento=data_vencimento,
        finalizado=prazo_data.finalizado,
        is_interno=is_interno,
        processo_id=prazo_data.processo_id
    )

    db.add(novo_prazo)
    db.commit()
    db.refresh(novo_prazo)

    return novo_prazo

def atualizar_prazo(db: Session, prazo: Prazo, dados_atualizados: PrazoUpdate):
    dados_dict = dados_atualizados.model_dump(exclude_unset=True)

    # Publicação no Diário Oficial: a data que valia até então era provisória
    # (petição inicial). Ao registrar a data oficial, o prazo deixa de ser
    # interno e o vencimento é recalculado a partir dela. Se a publicação for
    # revertida para None, volta ao prazo interno fixo.
    if "data_publicacao" in dados_dict:
        processo = db.query(Processo).filter(
            Processo.id == prazo.processo_id).first()

        if dados_dict["data_publicacao"] is not None:
            dados_dict["data_vencimento"] = calcular_data_vencimento(
                data_publicacao=dados_dict["data_publicacao"],
                tipo_processo=processo.tipo_processo
            )
            dados_dict["is_interno"] = False
        else:
            dados_dict["data_vencimento"] = calcular_data_vencimento_interno(processo)
            dados_dict["is_interno"] = True

    for chave, valor in dados_dict.items():
        setattr(prazo, chave, valor)

    db.commit()
    db.refresh(prazo)

    return prazo
