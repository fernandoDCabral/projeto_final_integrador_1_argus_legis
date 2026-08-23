from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import re
from app import models, schemas, database
from app.api.deps import get_current_user, VerificadorPerfil

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(get_current_user)]
)

def _buscar_no_escritorio(
        cliente_id: int,
        escritorio_id: int,
        db: Session
) -> models.Cliente:
    """
    Cliente de outro escritório deve ser indistinguível de cliente inexistente:
    responder 403 confirmaria que aquele id existe em algum lugar.
    """
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id,
        models.Cliente.escritorio_id == escritorio_id
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado!"
        )
    return cliente

@router.post(
    "/",
    response_model=schemas.ClienteResponse,
    status_code=status.HTTP_201_CREATED
)
def criar_cliente(
    cliente: schemas.ClienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    documento = cliente.cpf or cliente.cnpj
    coluna = models.Cliente.cpf if cliente.cpf else models.Cliente.cnpj

    duplicado = db.query(models.Cliente).filter(
        coluna == documento,
        models.Cliente.escritorio_id == current_user.escritorio_id
    ).first()
    if duplicado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um cliente com este documento: {duplicado.nome}."
        )

    dados = cliente.model_dump()
    dados["tipo_pessoa"] = cliente.tipo_pessoa.value
    dados["escritorio_id"] = current_user.escritorio_id

    novo_cliente = models.Cliente(**dados)
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

@router.get("/", response_model=List[schemas.ClienteResponse])
def listar_clientes(
    skip: int = 0,
    limit: int = 100,
    busca: str | None = None,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Cliente).filter(
        models.Cliente.escritorio_id == current_user.escritorio_id
    )

    if busca:
        # Procura pelo nome ou pelo documento; os documentos são gravados
        # apenas com dígitos, então a máscara digitada é descartada
        somente_digitos = re.sub(r"\D", "", busca)
        filtros = [models.Cliente.nome.icontains(busca)]
        if somente_digitos:
            filtros.append(models.Cliente.cpf.contains(somente_digitos))
            filtros.append(models.Cliente.cnpj.contains(somente_digitos))
        query = query.filter(or_(*filtros))

    return query.order_by(
        models.Cliente.nome.asc()).offset(skip).limit(limit).all()

@router.get("/{cliente_id}", response_model=schemas.ClienteResponse)
def buscar_cliente(
    cliente_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return _buscar_no_escritorio(cliente_id, current_user.escritorio_id, db)

@router.patch("/{cliente_id}", response_model=schemas.ClienteResponse)
def atualizar_cliente(
    cliente_id: int,
    dados_atualizados: schemas.ClienteUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    cliente = _buscar_no_escritorio(cliente_id, current_user.escritorio_id, db)

    for chave, valor in dados_atualizados.model_dump(exclude_unset=True).items():
        setattr(cliente, chave, valor)

    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}")
def excluir_cliente(
    cliente_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(VerificadorPerfil(["ADMIN"]))
):
    cliente = _buscar_no_escritorio(cliente_id, current_user.escritorio_id, db)

    # Excluir um cliente com processo levaria junto o histórico do caso
    processos_vinculados = db.query(models.Processo).filter(
        models.Processo.cliente_id == cliente_id).count()
    if processos_vinculados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir: o cliente possui "
                   f"{processos_vinculados} processo(s) vinculado(s)."
        )

    db.delete(cliente)
    db.commit()
    return {"detail": f"Cliente {cliente_id} removido com sucesso!"}
