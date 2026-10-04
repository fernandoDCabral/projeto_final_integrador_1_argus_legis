import io
import unicodedata
from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app import database, models, schemas
from app.api.deps import get_current_user

# Peças do processo em PDF, guardadas no próprio banco (Spec 003)
router = APIRouter(
    tags=["Documentos"],
    dependencies=[Depends(get_current_user)]
)

TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024
TIPOS_DOCUMENTO = ["Petição inicial", "Contestação", "Réplica", "Recurso", "Petição (outras)"]


def _buscar_processo(processo_id: int, usuario: models.Usuario, db: Session) -> models.Processo:
    # Processo de outro escritório responde igual a inexistente (404), como
    # em verificar_acesso_ao_processo. Não usamos ela aqui porque ela dá 403
    # para o ADMIN em processo com responsável, e o ADMIN pode listar e baixar
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id,
        models.Processo.escritorio_id == usuario.escritorio_id
    ).first()
    if not processo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo não encontrado!")
    return processo


def _buscar_documento(documento_id: int, usuario: models.Usuario, db: Session):
    documento = db.query(models.Documento).filter(models.Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado!")
    # Documento de outro escritório também vira 404
    processo = _buscar_processo(documento.processo_id, usuario, db)
    return documento, processo


def _so_responsavel(processo: models.Processo, usuario: models.Usuario):
    if processo.responsavel_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o advogado responsável pode fazer isso."
        )


@router.get("/processos/{processo_id}/documentos", response_model=List[schemas.DocumentoResponse])
def listar_documentos(
    processo_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    processo = _buscar_processo(processo_id, current_user, db)

    # Lista: quem vê o processo (responsável, ou qualquer advogado enquanto
    # está na piscina) e o ADMIN
    if current_user.perfil != "ADMIN" and processo.responsavel_id not in (None, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")

    return db.query(models.Documento).filter(
        models.Documento.processo_id == processo_id
    ).order_by(models.Documento.enviado_em.desc()).all()


@router.post("/processos/{processo_id}/documentos", response_model=schemas.DocumentoResponse)
def enviar_documento(
    processo_id: int,
    tipo: str = Form(...),
    arquivo: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    processo = _buscar_processo(processo_id, current_user, db)
    _so_responsavel(processo, current_user)

    if tipo not in TIPOS_DOCUMENTO:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Tipo inválido. Use um destes: {', '.join(TIPOS_DOCUMENTO)}."
        )

    # Lê no máximo 1 byte além do limite: se passar, recusa sem carregar o resto
    conteudo = arquivo.file.read(TAMANHO_MAXIMO_BYTES + 1)
    if len(conteudo) > TAMANHO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="O arquivo passa de 10 MB."
        )

    # Confere o conteúdo, não a extensão: um .docx renomeado para .pdf cai aqui
    if not conteudo.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Envie um arquivo PDF."
        )
    try:
        leitor = PdfReader(io.BytesIO(conteudo))
        if leitor.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="O PDF está protegido por senha. Envie uma versão sem senha."
            )
        paginas = len(leitor.pages)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Não foi possível ler o PDF. O arquivo pode estar corrompido."
        )

    documento = models.Documento(
        processo_id=processo.id,
        tipo=tipo,
        nome_arquivo=(arquivo.filename or "documento.pdf")[:255],
        tamanho=len(conteudo),
        paginas=paginas,
        conteudo=conteudo,
        enviado_por_id=current_user.id
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


@router.get("/documentos/{documento_id}/arquivo")
def baixar_documento(
    documento_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    documento, processo = _buscar_documento(documento_id, current_user, db)

    # Baixar: só o responsável e o ADMIN. Na piscina o advogado vê a lista,
    # mas o conteúdo só abre depois de assumir
    if current_user.perfil != "ADMIN":
        _so_responsavel(processo, current_user)

    # filename= leva uma versão sem acento para navegador antigo; filename*=
    # leva o nome original em UTF-8 ("contestação.pdf")
    nome_ascii = unicodedata.normalize("NFKD", documento.nome_arquivo).encode("ascii", "ignore").decode()
    nome_ascii = nome_ascii.replace('"', "") or "documento.pdf"
    return Response(
        content=documento.conteudo,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=\"{nome_ascii}\"; filename*=UTF-8''{quote(documento.nome_arquivo)}"
        }
    )


@router.delete("/documentos/{documento_id}")
def apagar_documento(
    documento_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    documento, processo = _buscar_documento(documento_id, current_user, db)
    _so_responsavel(processo, current_user)

    db.delete(documento)
    db.commit()
    return {"detail": f"Documento {documento_id} removido com sucesso!"}
