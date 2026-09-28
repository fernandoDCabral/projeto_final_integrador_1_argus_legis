from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import re
from app.api.deps import get_current_user, VerificadorPerfil
from app import models, schemas, database
from app.service import prazo_service, datajud_service
from app.utils.autorizacao import verificar_acesso_ao_processo

router = APIRouter(
    prefix="/processos",
    tags=["Processos"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", response_model=schemas.ProcessoResponse)
def criar_processo(
    processo: schemas.ProcessoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    # O cliente vem do corpo da requisição, então precisa ser conferido: sem
    # isto dá para vincular um processo deste escritório a cliente de outro
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == processo.cliente_id,
        models.Cliente.escritorio_id == current_user.escritorio_id
    ).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado neste escritório."
        )

    # cnj é opcional (processo pode nascer sem protocolo), mas quando
    # informado precisa ser único globalmente — checa antes do commit para
    # não deixar a IntegrityError da constraint UNIQUE estourar como 500.
    if processo.cnj:
        duplicado = db.query(models.Processo).filter(
            models.Processo.cnj == processo.cnj
        ).first()
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um processo com este CNJ: {duplicado.titulo}."
            )

    dados_processo = processo.model_dump()

    dados_processo["escritorio_id"] = current_user.escritorio_id
    dados_processo["criador_id"] = current_user.id
    # Coluna JSON não aceita date; em modo json as datas viram texto
    dados_processo["movimentacoes"] = processo.model_dump(mode="json")["movimentacoes"]

    novo_processo = models.Processo(**dados_processo)
    if novo_processo.data_publicacao_datajud:
        novo_processo.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, novo_processo.data_publicacao_datajud, novo_processo.tipo_processo)

    db.add(novo_processo)
    db.flush()
    # Busca a data_cadastro gerada pelo banco, que o prazo inicial usa
    db.refresh(novo_processo)

    # O prazo inicial conta da data de cadastro, então já nasce com o
    # processo e fica visível na piscina antes de alguém assumir
    db.add(models.Prazo(
        descricao=f"Prazo Inicial ({novo_processo.tipo_processo})",
        data_vencimento=prazo_service.calcular_data_vencimento_interno(db, novo_processo),
        interno=True,
        processo_id=novo_processo.id
    ))
    db.commit()
    db.refresh(novo_processo)
    return novo_processo

@router.get("/", response_model=List[schemas.ProcessoResponse])
def listar_processos(
    skip: int = 0,
    limit: int = 100,
    cnj: str | None = None,
    status: str | None = None,
    tribunal: str | None = None,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    # Filtra todos os processos apenas do escritório do usuário logado
    query = db.query(models.Processo).filter(
        models.Processo.escritorio_id == current_user.escritorio_id
    )

    # Filtra processos para advogados, mostrando apenas os processos
    # que são responsáveis ou que não possuem responsável (piscina de processos)
    if current_user.perfil == "ADVOGADO":
        query = query.filter(
            or_(
                models.Processo.responsavel_id == current_user.id,
                models.Processo.responsavel_id.is_(None)
            )
        )

    # OBS: se o perfil do usuário for `ADMIN`, ele verá todos os processos
    # do escritório, na piscina ou já assumidos por advogados
    if cnj:
        cnj_limpo = re.sub(r"\D", "", cnj)
        query = query.filter(models.Processo.cnj.contains(cnj_limpo))
    if status:
        query = query.filter(models.Processo.status == status)
    if tribunal:
        query = query.filter(models.Processo.tribunal.icontains(tribunal))
    
    return query.order_by(
        models.Processo.id.desc()).offset(skip).limit(limit).all()

@router.get("/{processo_id}", response_model=schemas.ProcessoResponse)
def buscar_processo(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    return processo

@router.patch("/{processo_id}", response_model=schemas.ProcessoResponse)
def atualizar_processo(
    processo_id: int,
    dados_atualizados: schemas.ProcessoUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    processo_atual = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo_atual:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)

    dados_dict = dados_atualizados.model_dump(exclude_unset=True)

    if dados_dict.get("cnj"):
        duplicado = db.query(models.Processo).filter(
            models.Processo.cnj == dados_dict["cnj"],
            models.Processo.id != processo_id
        ).first()
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um processo com este CNJ: {duplicado.titulo}."
            )

    for chave, valor in dados_dict.items():
        setattr(processo_atual, chave, valor)

    # O tipo define quantos dias o prazo tem, então a estimativa muda junto
    if "tipo_processo" in dados_dict and processo_atual.data_publicacao_datajud:
        processo_atual.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, processo_atual.data_publicacao_datajud, processo_atual.tipo_processo)

    db.commit()
    db.refresh(processo_atual)
    return processo_atual

@router.post("/{processo_id}/datajud", response_model=schemas.ProcessoResponse)
def atualizar_dados_datajud(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    if not processo.cnj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Processo sem número CNJ não pode ser consultado no DataJud."
        )

    consulta = schemas.ConsultaDatajudResponse(
        **datajud_service.consultar_processo(processo.cnj, db))

    processo.classe = consulta.classe
    processo.orgao_julgador = consulta.orgao_julgador
    processo.grau = consulta.grau
    processo.data_ajuizamento = consulta.data_ajuizamento
    processo.assuntos = consulta.assuntos
    processo.movimentacoes = [m.model_dump(mode="json") for m in consulta.movimentacoes]
    processo.datajud_atualizado_em = consulta.atualizado_em
    processo.data_publicacao_datajud = consulta.data_publicacao
    processo.peticao_apos_publicacao = consulta.peticao_apos_publicacao
    processo.prazo_estimado = None
    if consulta.data_publicacao:
        processo.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, consulta.data_publicacao, processo.tipo_processo)

    db.commit()
    db.refresh(processo)
    return processo

@router.delete("/{processo_id}")
def excluir_processo(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    processo_para_excluir = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo_para_excluir:
        raise HTTPException(
            status_code=404,
            detail="Processo não encontrado para exclusão!"
        )
    
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)

    db.delete(processo_para_excluir)
    db.commit()
    return {"detail": f"Processo {processo_id} removido com sucesso!"}

@router.get(
    "/{processo_id}/prazo-movimentacao",
    response_model=schemas.ProcessoPrazoMovimentacaoResponse
)
def calcular_prazo_movimentacao(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    return prazo_service.calcular_prazo_movimentacao(processo)

@router.get(
    "/{processo_id}/prazos", 
    response_model=List[schemas.PrazoResponse]
)
def listar_prazos_por_processos(
    processo_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)
    return db.query(models.Prazo).filter(
        models.Prazo.processo_id == processo_id).all()
    
