import logging
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.email import enviar_email, montar_email_recuperacao
from app.models import TokenRecuperacao, Usuario

logger = logging.getLogger("argus.recuperacao")

# Quantos pedidos são aceitos por usuário dentro da janela abaixo. Sem isso,
# qualquer pessoa poderia inundar a caixa de entrada de um usuário conhecido
MAX_PEDIDOS_POR_JANELA = 3
JANELA_MINUTOS = 60

def solicitar_recuperacao(db: Session, email: str) -> None:
    """
    Cria o token e dispara o e-mail.

    Não retorna nada e nunca sinaliza se o e-mail existe: a rota responde
    sempre a mesma coisa. Caso contrário o endpoint viraria uma ferramenta
    para descobrir quem tem conta no sistema.
    """
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        logger.info("Pedido de recuperação para e-mail inexistente.")
        return

    agora = datetime.now()

    pedidos_recentes = db.query(TokenRecuperacao).filter(
        TokenRecuperacao.usuario_id == usuario.id,
        TokenRecuperacao.criado_em >= agora - timedelta(minutes=JANELA_MINUTOS)
    ).count()
    if pedidos_recentes >= MAX_PEDIDOS_POR_JANELA:
        logger.warning("Limite de pedidos atingido para o usuário %s", usuario.id)
        return

    # Um pedido novo invalida os anteriores: se o usuário pediu de novo, é
    # porque o link antigo não serviu, e deixá-lo ativo só amplia a janela
    # de exposição
    db.query(TokenRecuperacao).filter(
        TokenRecuperacao.usuario_id == usuario.id,
        TokenRecuperacao.usado_em.is_(None)
    ).update({TokenRecuperacao.usado_em: agora}, synchronize_session=False)

    token_puro = security.gerar_token_recuperacao()

    registro = TokenRecuperacao(
        usuario_id=usuario.id,
        token_hash=security.gerar_hash_token(token_puro),
        expira_em=agora + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    )
    db.add(registro)
    db.commit()

    # A raiz com querystring funciona tanto no dev server quanto em hospedagem
    # estática — o app lê o token da URL sem precisar de rotas no front
    link = f"{settings.FRONTEND_URL}/?token={token_puro}"
    assunto, texto, html = montar_email_recuperacao(
        nome=usuario.nome,
        link=link,
        minutos=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    enviar_email(usuario.email, assunto, texto, html)

def _buscar_token_valido(db: Session, token: str) -> TokenRecuperacao:
    registro = db.query(TokenRecuperacao).filter(
        TokenRecuperacao.token_hash == security.gerar_hash_token(token)
    ).first()

    # A mesma mensagem para token inexistente, já usado e expirado: detalhar
    # a diferença ajudaria quem está testando tokens no chute
    if not registro or not registro.esta_valido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link inválido ou expirado. Solicite uma nova redefinição."
        )
    return registro

def verificar_token(db: Session, token: str) -> Usuario:
    return _buscar_token_valido(db, token).usuario

def redefinir_senha(db: Session, token: str, nova_senha: str) -> Usuario:
    registro = _buscar_token_valido(db, token)
    usuario = registro.usuario

    usuario.senha = security.gerar_hash_senha(nova_senha)
    registro.usado_em = datetime.now()

    db.commit()
    db.refresh(usuario)

    logger.info("Senha redefinida para o usuário %s", usuario.id)
    return usuario
