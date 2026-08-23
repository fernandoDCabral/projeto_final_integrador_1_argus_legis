import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("argus.email")

def enviar_email(destinatario: str, assunto: str, texto: str, html: str) -> bool:
    """
    Envia um e-mail via SMTP.

    Se as credenciais não estiverem configuradas, escreve o conteúdo no log do
    servidor em vez de enviar. Isso mantém o fluxo utilizável em
    desenvolvimento e numa apresentação sem depender da rede — e é o motivo
    de a função nunca propagar exceção: falha de e-mail não pode derrubar a
    requisição de quem pediu a recuperação.
    """
    if not settings.email_configurado:
        logger.warning(
            "\n%s\n[E-MAIL NAO ENVIADO - SMTP nao configurado]\n"
            "Para: %s\nAssunto: %s\n\n%s\n%s\n",
            "=" * 70, destinatario, assunto, texto, "=" * 70
        )
        return False

    mensagem = EmailMessage()
    mensagem["Subject"] = assunto
    mensagem["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    mensagem["To"] = destinatario
    mensagem.set_content(texto)
    mensagem.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as servidor:
            servidor.starttls()
            servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.send_message(mensagem)
        logger.info("E-mail enviado para %s", destinatario)
        return True
    except Exception:
        # O link também vai para o log: assim um problema de SMTP não deixa
        # ninguém trancado para fora do sistema
        logger.exception("Falha ao enviar e-mail para %s", destinatario)
        logger.warning("Conteudo do e-mail que falhou:\n%s", texto)
        return False

def montar_email_recuperacao(nome: str, link: str, minutos: int):
    assunto = "Redefinição de senha - Argus Legis"

    texto = (
        f"Olá, {nome}.\n\n"
        f"Recebemos um pedido para redefinir a senha da sua conta no Argus Legis.\n"
        f"Abra o link abaixo para cadastrar uma nova senha:\n\n"
        f"{link}\n\n"
        f"O link vale por {minutos} minutos e só pode ser usado uma vez.\n\n"
        f"Se não foi você que pediu, ignore esta mensagem: sua senha atual "
        f"continua valendo e nada foi alterado.\n\n"
        f"Argus Legis"
    )

    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;
            color:#1a2a3a;line-height:1.6">
  <h2 style="color:#1a2a3a;border-bottom:2px solid #D4AF37;padding-bottom:10px">
    Redefinição de senha
  </h2>
  <p>Olá, <strong>{nome}</strong>.</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta no Argus Legis.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{link}"
       style="background:#D4AF37;color:#fff;padding:12px 26px;border-radius:5px;
              text-decoration:none;font-weight:bold;display:inline-block">
      Cadastrar nova senha
    </a>
  </p>
  <p style="font-size:13px;color:#666">
    O link vale por {minutos} minutos e só pode ser usado uma vez.
  </p>
  <p style="font-size:13px;color:#666">
    Se não foi você que pediu, ignore esta mensagem: sua senha atual continua
    valendo e nada foi alterado.
  </p>
  <p style="font-size:12px;color:#999;word-break:break-all">
    Se o botão não funcionar, copie este endereço no navegador:<br>{link}
  </p>
</div>"""

    return assunto, texto, html
