from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date, datetime, timedelta, timezone
import re
from app.api.deps import get_current_user, VerificadorPerfil
from app import models, schemas, database
from app.service import prazo_service, datajud_service, djen_service
from app.utils.autorizacao import verificar_acesso_ao_processo

# "Atualizar todos" pula quem foi consultado no DJEN há menos que isso (Spec 012)
MINUTOS_PARA_PULAR = 60
# Movimento Petição no DataJud (mesmo código do datajud_service)
CODIGO_PETICAO = 85

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
    # informado precisa ser único dentro do escritório (Spec 008). Filtra
    # pelo escritório para não mostrar título de processo de outro escritório
    # e checa antes do commit para a constraint UNIQUE não estourar como 500.
    if processo.cnj:
        duplicado = db.query(models.Processo).filter(
            models.Processo.cnj == processo.cnj,
            models.Processo.escritorio_id == current_user.escritorio_id
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
    # O status vem do DataJud, não do que foi digitado (Spec 001)
    novo_processo.status = "Encerrado" if novo_processo.encerrado_em else "Ativo"
    # Processo encerrado não tem prazo a cumprir (Spec 002)
    if novo_processo.data_publicacao and not novo_processo.encerrado_em:
        novo_processo.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, novo_processo.data_publicacao, novo_processo.tipo_processo)

    # Nasce sem prazo: o prazo só existe a partir de uma publicação, que o
    # advogado informa ao assumir (Spec 002)
    db.add(novo_processo)
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

    # Mesma regra do cadastro: CNJ único só dentro do escritório (Spec 008)
    if dados_dict.get("cnj"):
        duplicado = db.query(models.Processo).filter(
            models.Processo.cnj == dados_dict["cnj"],
            models.Processo.escritorio_id == current_user.escritorio_id,
            models.Processo.id != processo_id
        ).first()
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um processo com este CNJ: {duplicado.titulo}."
            )

    # Cliente e responsável vêm do corpo, então precisam ser conferidos: sem
    # isto dá para ligar o processo a gente de outro escritório (Spec 009)
    if "cliente_id" in dados_dict:
        cliente = db.query(models.Cliente).filter(
            models.Cliente.id == dados_dict["cliente_id"],
            models.Cliente.escritorio_id == current_user.escritorio_id
        ).first()
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado neste escritório."
            )

    # responsavel_id null continua valendo (processo volta para a piscina)
    if dados_dict.get("responsavel_id"):
        advogado = db.query(models.Usuario).filter(
            models.Usuario.id == dados_dict["responsavel_id"],
            models.Usuario.escritorio_id == current_user.escritorio_id,
            models.Usuario.perfil == "ADVOGADO"
        ).first()
        if not advogado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Advogado não encontrado neste escritório."
            )

    for chave, valor in dados_dict.items():
        setattr(processo_atual, chave, valor)

    # O tipo define quantos dias o prazo tem, então a estimativa muda junto
    if ("tipo_processo" in dados_dict and processo_atual.data_publicacao
            and not processo_atual.encerrado_em):
        processo_atual.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, processo_atual.data_publicacao, processo_atual.tipo_processo)

    db.commit()
    db.refresh(processo_atual)
    return processo_atual

@router.post("/{processo_id}/liberar", response_model=schemas.ProcessoResponse)
def liberar_processo(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADVOGADO"]))
):
    verificar_acesso_ao_processo(
        processo_id, current_user.id, current_user.escritorio_id, db)
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    # verificar_acesso_ao_processo já deixa passar quando responsavel_id é
    # NULL (regra da piscina), mas aqui isso não faz sentido: não dá pra
    # liberar algo que já está livre. Só o dono de fato pode liberar.
    if processo.responsavel_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este processo não está sob sua responsabilidade."
        )

    processo.responsavel_id = None
    db.commit()
    db.refresh(processo)
    return processo

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

    dados_consulta = datajud_service.consultar_processo(processo.cnj, db)
    consulta = schemas.ConsultaDatajudResponse(**dados_consulta)

    processo.classe = consulta.classe
    processo.orgao_julgador = consulta.orgao_julgador
    processo.grau = consulta.grau
    processo.data_ajuizamento = consulta.data_ajuizamento
    processo.assuntos = consulta.assuntos
    processo.movimentacoes = [m.model_dump(mode="json") for m in consulta.movimentacoes]
    processo.datajud_atualizado_em = consulta.atualizado_em
    processo.data_publicacao = consulta.data_publicacao
    processo.data_disponibilizacao = consulta.data_disponibilizacao
    processo.fonte_publicacao = consulta.fonte_publicacao
    processo.tipo_publicacao = consulta.tipo_publicacao
    processo.link_publicacao = consulta.link_publicacao
    processo.hash_publicacao = consulta.hash_publicacao
    processo.peticao_apos_publicacao = consulta.peticao_apos_publicacao
    # Pode encerrar ou voltar a ficar ativo, se o processo foi reativado
    processo.encerrado_em = consulta.encerrado_em
    processo.status = "Encerrado" if consulta.encerrado_em else "Ativo"
    processo.prazo_estimado = None
    if consulta.data_publicacao and not consulta.encerrado_em:
        processo.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, consulta.data_publicacao, processo.tipo_processo)

    # Mesma regra do "Atualizar todos" (Spec 012): só marca a consulta se o
    # DJEN respondeu, e publicação nova num assumido vira prazo "A conferir"
    if dados_consulta["djen_respondeu"]:
        processo.djen_consultado_em = datetime.now(timezone.utc)
    prazo_service.criar_prazo_a_conferir(db, processo)

    db.commit()
    db.refresh(processo)
    return processo

@router.post("/{processo_id}/djen", response_model=schemas.AtualizacaoDjenResponse)
def atualizar_pelo_djen(
    processo_id: int,
    forcar: bool = False,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Consulta só o DJEN de um processo (botão "Atualizar todos", Spec 012).

    A tela chama um processo por vez. Falha do DJEN não vira erro HTTP: volta
    200 com resultado "erro" para a tela seguir para o próximo.
    """
    # Outro escritório: 404, como em verificar_acesso_ao_processo
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id,
        models.Processo.escritorio_id == current_user.escritorio_id
    ).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado!")

    # O admin atualiza todos do escritório; o advogado, os dele e os da piscina
    if current_user.perfil != "ADMIN":
        verificar_acesso_ao_processo(
            processo_id, current_user.id, current_user.escritorio_id, db)

    if processo.status == "Encerrado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Processo encerrado não é atualizado pelo DJEN."
        )
    if not processo.cnj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Processo sem número CNJ não pode ser consultado no DJEN."
        )

    agora = datetime.now(timezone.utc)
    if (not forcar and processo.djen_consultado_em
            and agora - processo.djen_consultado_em < timedelta(minutes=MINUTOS_PARA_PULAR)):
        return {"resultado": "pulado", "processo": processo}

    digitos = re.sub(r"\D", "", processo.cnj)
    try:
        djen = djen_service.buscar_ultima_publicacao(digitos, db)
    except djen_service.DjenIndisponivel:
        # Nada é gravado, nem a hora da consulta, para o "Tentar de novo"
        return {"resultado": "erro", "processo": processo}

    resultado = "sem_novidade"
    # A mesma data que a guardada não é novidade
    if djen and (processo.data_publicacao is None
                 or djen["data_publicacao"] > processo.data_publicacao):
        processo.data_publicacao = djen["data_publicacao"]
        processo.data_disponibilizacao = djen["data_disponibilizacao"]
        processo.fonte_publicacao = "DJEN"
        processo.tipo_publicacao = djen["tipo"]
        processo.link_publicacao = djen["link"]
        processo.hash_publicacao = djen["hash"]
        processo.prazo_estimado = prazo_service.calcular_data_vencimento(
            db, processo.data_publicacao, processo.tipo_processo)
        # Indício de resposta: petição já salva depois da disponibilização.
        # As movimentações ficam no banco como texto (JSON)
        processo.peticao_apos_publicacao = any(
            mov.get("codigo") == CODIGO_PETICAO
            and date.fromisoformat(mov["data"]) > processo.data_disponibilizacao
            for mov in (processo.movimentacoes or [])
        )
        resultado = "nova_publicacao"

    processo.djen_consultado_em = agora
    # Num assumido, publicação mais nova que o último prazo vira "A conferir".
    # Se nasceu prazo, a tela precisa destacar o processo, mesmo sem data nova
    if prazo_service.criar_prazo_a_conferir(db, processo):
        resultado = "nova_publicacao"

    db.commit()
    db.refresh(processo)
    return {"resultado": resultado, "processo": processo}

@router.delete("/{processo_id}")
def excluir_processo(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    # Filtra escritorio_id direto na query em vez de reusar
    # verificar_acesso_ao_processo: sua semântica de "dono responde" não se
    # aplica aqui, e reusá-la faria um processo com responsável de outro
    # advogado cair no 403 genérico antes de chegar na checagem abaixo.
    processo_para_excluir = db.query(models.Processo).filter(
        models.Processo.id == processo_id,
        models.Processo.escritorio_id == current_user.escritorio_id
    ).first()
    if not processo_para_excluir:
        raise HTTPException(
            status_code=404,
            detail="Processo não encontrado para exclusão!"
        )

    if processo_para_excluir.responsavel_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível excluir processos sem responsável (fora da piscina)."
        )

    db.delete(processo_para_excluir)
    db.commit()
    return {"detail": f"Processo {processo_id} removido com sucesso!"}

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
    
